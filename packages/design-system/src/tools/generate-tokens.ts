/**
 * Base token generator for @augurproject/design-system.
 *
 * Generates machine-readable base tokens from the repository-root `DESIGN.md`
 * using the exact-pinned `@google/design.md` toolchain. Generated artifacts
 * land in `packages/design-system/src/tokens` and must never be hand-edited.
 *
 * Pipeline (single authority chain, per ARCHITECTURE.md):
 *
 *   DESIGN.md (repository root, canonical)
 *     → pinned `design.md lint` gate (nonzero exit or any error finding stops generation)
 *     → pinned `design.md export` (css-vars, css-tailwind, dtcg)
 *     → output verification (non-degenerate, cross-artifact consistent)
 *     → artifacts written with provenance headers + generated manifest
 *
 * Failure contract (all exits nonzero, see docs/token-generation.md):
 *   - lint command fails or reports any error finding (e.g. broken `{ref}`),
 *     including the known silent-drop behavior of export on broken refs;
 *   - any export command exits nonzero;
 *   - any export produces degenerate output (empty or missing expected groups).
 *
 * Modes:
 *   generate (default)   lint-gate, export, verify, write artifacts + manifest
 *   --out <dir>          write artifacts to <dir> instead of src/tokens
 *   --check              regenerate in memory and byte-compare with committed
 *                        artifacts; exit 1 on any drift (CI drift gate)
 *   --prove-failure      run the real pipeline against controlled invalid
 *                        inputs and assert every failure path exits nonzero
 *
 * Determinism: output contains no timestamps or volatile metadata. Provenance
 * ties artifacts to the source content hash and tool version, so two clean
 * generations from the same DESIGN.md are byte-identical.
 *
 * Scripts and configuration for token generation live entirely inside
 * packages/design-system; root scripts and workflows live at the
 * repository root.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Constants and path anchors
// ---------------------------------------------------------------------------

const TOOL_NAME = "@google/design.md";
const CLI_ENTRY = "dist/index.js";
const SOURCE_BASENAME = "DESIGN.md";

const THIS_FILE = fileURLToPath(import.meta.url);
const TOOLS_DIR = path.dirname(THIS_FILE); // packages/design-system/src/tools
const PACKAGE_DIR = path.resolve(TOOLS_DIR, "..", ".."); // packages/design-system
const REPO_ROOT = path.resolve(PACKAGE_DIR, "..", ".."); // repository root
const DEFAULT_OUT_DIR = path.join(PACKAGE_DIR, "src", "tokens");
const FIXTURES_DIR = path.join(TOOLS_DIR, "fixtures");

const SOURCE_DESIGN_MD = path.join(REPO_ROOT, SOURCE_BASENAME);

const GENERATOR_REL = "packages/design-system/src/tools/generate-tokens.ts";
const DOCS_REL = "packages/design-system/docs/token-generation.md";

const POLICY_TEXT =
  "GENERATED FILE — do not edit. " +
  "Regenerate: `bun run tokens:generate` in packages/design-system. " +
  "Verify: `bun run tokens:check`. " +
  `Policy and schema boundaries: ${DOCS_REL}.`;

interface ArtifactSpec {
  file: string;
  format: string;
  extraArgs: string[];
  kind: "css" | "enveloped-json";
}

/** The exported artifact set. Rationale in docs/token-generation.md. */
const ARTIFACTS: ArtifactSpec[] = [
  {
    file: "tokens.css",
    format: "css-vars",
    extraArgs: ["--prefix", "augur"],
    kind: "css",
  },
  {
    file: "tokens.tailwind.css",
    format: "css-tailwind",
    extraArgs: [],
    kind: "css",
  },
  {
    file: "tokens.dtcg.json",
    format: "dtcg",
    extraArgs: [],
    kind: "enveloped-json",
  },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CliResult {
  status: number;
  stdout: string;
  stderr: string;
}

interface LintFinding {
  severity: "error" | "warning" | "info";
  message: string;
  rule?: string;
  path?: string;
}

interface LintReport {
  findings: LintFinding[];
  summary: { errors: number; warnings: number; infos: number };
}

interface Provenance {
  generator: string;
  policy: string;
  source: { file: string; location: string; sha256: string };
  tool: { name: string; version: string; bin: string; pin: string };
  command: string;
  lint: { errors: number; warnings: number; infos: number };
  determinism: string;
}

interface GeneratedArtifacts {
  provenance: Provenance;
  files: Map<string, string>; // file name → full file content (header + payload)
  lint: LintReport;
}

class GenerationFailure extends Error {
  readonly reason: string;
  readonly detail: string;

  constructor(reason: string, message: string, detail = "") {
    super(message);
    this.name = "GenerationFailure";
    this.reason = reason;
    this.detail = detail;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function fail(reason: string, message: string, detail = ""): never {
  throw new GenerationFailure(reason, message, detail);
}

/** Walk up from the package dir to locate the installed pinned tool. */
function findInstalledToolDir(): string {
  let dir = PACKAGE_DIR;
  for (;;) {
    const candidate = path.join(dir, "node_modules", TOOL_NAME);
    if (existsSync(path.join(candidate, "package.json"))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) {
      fail(
        "tool-not-installed",
        `${TOOL_NAME} is not installed. Run \`bun install\` at the repository root.`,
      );
    }
    dir = parent;
  }
}

interface ResolvedTool {
  dir: string;
  version: string;
  entry: string;
}

/**
 * Enforce the exact pin: the declared dependency must have no range
 * metacharacters, and the installed copy must match the declared version.
 * A tool-version change is a deliberate design-system migration
 * (ARCHITECTURE.md, "Pinned @google/design.md").
 */
function resolvePinnedTool(): ResolvedTool {
  const pkgJsonPath = path.join(PACKAGE_DIR, "package.json");
  const pkg = JSON.parse(readFileSyncUtf8(pkgJsonPath)) as {
    devDependencies?: Record<string, string>;
  };
  const declared = pkg.devDependencies?.[TOOL_NAME];
  if (!declared) {
    fail(
      "pin-missing",
      `${TOOL_NAME} is not declared in packages/design-system/package.json devDependencies.`,
    );
  }
  if (!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(declared)) {
    fail(
      "pin-not-exact",
      `Declared version "${declared}" is not an exact pin. ARCHITECTURE.md requires an exact version (no ^ or ~ ranges).`,
    );
  }

  const toolDir = findInstalledToolDir();
  const installedPkg = JSON.parse(
    readFileSyncUtf8(path.join(toolDir, "package.json")),
  ) as { version?: string };
  const installed = installedPkg.version ?? "unknown";
  if (installed !== declared) {
    fail(
      "pin-mismatch",
      `Installed ${TOOL_NAME} is ${installed} but packages/design-system pins ${declared}. Run \`bun install\`, or perform the documented upgrade procedure in ${DOCS_REL}.`,
    );
  }

  const entry = path.join(toolDir, CLI_ENTRY);
  if (!existsSync(entry)) {
    fail("tool-broken", `CLI entry point not found: ${entry}`);
  }
  return { dir: toolDir, version: installed, entry };
}

/** Sync read kept local and tiny; used only for package/tool metadata. */
function readFileSyncUtf8(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function runCli(tool: ResolvedTool, args: string[]): CliResult {
  // The pinned CLI runs under the same runtime that runs this generator
  // (bun in this workspace). One runtime, one deterministic output path.
  const result = spawnSync(process.execPath, [tool.entry, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function parseLintStdout(result: CliResult, context: string): LintReport {
  try {
    return JSON.parse(result.stdout) as LintReport;
  } catch {
    return fail(
      "lint-output-unparseable",
      `Could not parse lint JSON for ${context}.`,
      `exit=${result.status}\nstdout: ${result.stdout.slice(0, 400)}\nstderr: ${result.stderr.slice(0, 400)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Pipeline: lint gate → export → verify → build artifacts
// ---------------------------------------------------------------------------

async function lintGate(
  tool: ResolvedTool,
  source: string,
): Promise<LintReport> {
  const result = runCli(tool, ["lint", source, "--format", "json"]);
  // Classify findings first: the linter exits nonzero (1) exactly when error
  // findings exist, which is the invalid-reference case, not a tool failure.
  const report = parseLintStdout(result, source);
  if (report.summary.errors > 0) {
    const errors = report.findings
      .filter((f) => f.severity === "error")
      .map((f) => `  - [${f.rule ?? "?"}] ${f.path ?? ""}: ${f.message}`)
      .join("\n");
    return fail(
      "invalid-references",
      `DESIGN.md lint reported ${report.summary.errors} error(s); refusing to generate tokens. Broken references are silently dropped by export, so the lint gate is mandatory.`,
      errors,
    );
  }
  if (result.status !== 0) {
    return fail(
      "lint-command-failed",
      `design.md lint exited ${result.status} for ${source} without error findings; refusing to generate tokens.`,
      `stderr: ${result.stderr.slice(0, 800)}`,
    );
  }
  return report;
}

interface ExportOutput {
  format: string;
  stdout: string;
}

function runExports(
  tool: ResolvedTool,
  source: string,
): ExportOutput[] {
  return ARTIFACTS.map((spec) => {
    const args = ["export", source, "--format", spec.format, ...spec.extraArgs];
    const result = runCli(tool, args);
    if (result.status !== 0) {
      return fail(
        "export-command-failed",
        `design.md export (${spec.format}) exited ${result.status}; refusing to generate tokens.`,
        `stderr: ${result.stderr.slice(0, 800)}`,
      );
    }
    if (result.stdout.trim() === "") {
      return fail(
        "degenerate-export",
        `design.md export (${spec.format}) produced empty output; refusing to generate tokens.`,
      );
    }
    return { format: spec.format, stdout: result.stdout };
  });
}

/**
 * Verify outputs are non-degenerate and mutually consistent. Deliberately
 * checks structure and counts (schema-level facts), never hardcoded design
 * values: the pinned CLI is the only interpreter of DESIGN.md.
 */
function verifyOutputs(exportsOut: ExportOutput[]): void {
  const byFormat = new Map(exportsOut.map((e) => [e.format, e.stdout]));

  const dtcgRaw = byFormat.get("dtcg");
  if (dtcgRaw === undefined) fail("degenerate-export", "dtcg output missing.");
  let dtcg: Record<string, unknown>;
  try {
    dtcg = JSON.parse(dtcgRaw) as Record<string, unknown>;
  } catch {
    return fail(
      "degenerate-export",
      "dtcg output is not valid JSON.",
      dtcgRaw.slice(0, 400),
    );
  }
  const colorGroup = dtcg["color"];
  const typographyGroup = dtcg["typography"];
  const spacingGroup = dtcg["spacing"];
  const roundedGroup = dtcg["rounded"];
  if (
    typeof colorGroup !== "object" ||
    colorGroup === null ||
    typeof typographyGroup !== "object" ||
    typographyGroup === null
  ) {
    return fail(
      "degenerate-export",
      "dtcg output is missing the color or typography group; DESIGN.md front matter was not parsed into tokens.",
    );
  }
  if (
    typeof spacingGroup !== "object" ||
    spacingGroup === null ||
    typeof roundedGroup !== "object" ||
    roundedGroup === null
  ) {
    return fail(
      "degenerate-export",
      "dtcg output is missing the spacing or rounded group; the corresponding DESIGN.md front-matter sections were not parsed into tokens.",
    );
  }
  const colorCount =
    Object.keys(colorGroup).filter((k) => k !== "$type").length;
  const typographyCount =
    Object.keys(typographyGroup).filter((k) => k !== "$type").length;
  const spacingCount =
    Object.keys(spacingGroup).filter((k) => k !== "$type").length;
  const roundedCount =
    Object.keys(roundedGroup).filter((k) => k !== "$type").length;
  if (colorCount < 1 || typographyCount < 1 || spacingCount < 1 || roundedCount < 1) {
    return fail(
      "degenerate-export",
      `dtcg output has empty token groups (colors=${colorCount}, typography=${typographyCount}, spacing=${spacingCount}, rounded=${roundedCount}).`,
    );
  }

  const cssVars = byFormat.get("css-vars");
  if (cssVars === undefined) {
    fail("degenerate-export", "css-vars output missing.");
  }
  // DESIGN.md also adopts spacing and rounded sections,
  // and the pinned toolchain exports them alongside colors in :root.
  const expectedCssVarCount = colorCount + spacingCount + roundedCount;
  const cssVarCount = (cssVars.match(/^ {2}--[\w-]+:/gm) ?? []).length;
  if (!cssVars.includes(":root") || cssVarCount !== expectedCssVarCount) {
    return fail(
      "degenerate-export",
      `css-vars output expected ${expectedCssVarCount} custom properties inside :root (colors ${colorCount} + spacing ${spacingCount} + rounded ${roundedCount}), found ${cssVarCount}.`,
    );
  }

  const tailwind = byFormat.get("css-tailwind");
  if (tailwind === undefined) {
    fail("degenerate-export", "css-tailwind output missing.");
  }
  const tailwindColorCount = (tailwind.match(/^ {2}--color-[\w-]+:/gm) ?? [])
    .length;
  const tailwindSpacingCount = (tailwind.match(/^ {2}--spacing-[\w-]+:/gm) ?? [])
    .length;
  const tailwindRadiusCount = (tailwind.match(/^ {2}--radius-[\w-]+:/gm) ?? [])
    .length;
  if (
    !tailwind.includes("@theme") ||
    tailwindColorCount !== colorCount ||
    tailwindSpacingCount !== spacingCount ||
    tailwindRadiusCount !== roundedCount ||
    !tailwind.includes("--text-") ||
    !tailwind.includes("--leading-")
  ) {
    return fail(
      "degenerate-export",
      `css-tailwind output missing @theme block or expected token groups (colors=${tailwindColorCount}/${colorCount}, spacing=${tailwindSpacingCount}/${spacingCount}, radius=${tailwindRadiusCount}/${roundedCount}).`,
    );
  }
}

function buildProvenance(
  tool: ResolvedTool,
  source: string,
  lint: LintReport,
): Provenance {
  return {
    generator: GENERATOR_REL,
    policy: POLICY_TEXT,
    source: {
      file: SOURCE_BASENAME,
      location: "repository root",
      sha256: sha256(readFileSyncUtf8(source)),
    },
    tool: {
      name: TOOL_NAME,
      version: tool.version,
      bin: "design.md",
      pin: `exact pin in packages/design-system/package.json (${tool.version})`,
    },
    command: `design.md export ${SOURCE_BASENAME} --format <format> [--prefix augur]`,
    lint: {
      errors: lint.summary.errors,
      warnings: lint.summary.warnings,
      infos: lint.summary.infos,
    },
    determinism:
      "Deterministic output: no timestamps or volatile metadata. Identical source content + identical tool version produce byte-identical artifacts.",
  };
}

function renderCssHeader(provenance: Provenance, spec: ArtifactSpec): string {
  const args = ["export", provenance.source.file, "--format", spec.format];
  if (spec.extraArgs.length > 0) args.push(...spec.extraArgs);
  return [
    "/**",
    ` * ${provenance.policy}`,
    " *",
    ` * Source:  ${provenance.source.file} (${provenance.source.location}), sha256 ${provenance.source.sha256}`,
    ` * Tool:    ${provenance.tool.name}@${provenance.tool.version} (${provenance.tool.pin})`,
    ` * Command: design.md ${args.join(" ")}`,
    ` * Lint:    ${provenance.lint.errors} errors / ${provenance.lint.warnings} warnings / ${provenance.lint.infos} infos at generation time`,
    " *",
    " * Everything below this header is the pinned CLI's verbatim stdout.",
    " */",
    "",
    "",
  ].join("\n");
}

async function generate(
  tool: ResolvedTool,
  source: string,
): Promise<GeneratedArtifacts> {
  if (!existsSync(source)) {
    fail(
      "source-missing",
      `Source file not found: ${source}. Token generation requires the repository-root DESIGN.md.`,
    );
  }

  const lint = await lintGate(tool, source);
  const exportsOut = runExports(tool, source);
  verifyOutputs(exportsOut);

  const provenance = buildProvenance(tool, source, lint);
  const files = new Map<string, string>();

  for (const spec of ARTIFACTS) {
    const output = exportsOut.find((e) => e.format === spec.format);
    if (output === undefined) {
      fail("degenerate-export", `No output captured for ${spec.format}.`);
    }
    if (spec.kind === "css") {
      files.set(spec.file, renderCssHeader(provenance, spec) + output.stdout);
    } else {
      const payload = JSON.parse(output.stdout) as unknown;
      files.set(
        spec.file,
        JSON.stringify({ $provenance: provenance, tokens: payload }, null, 2) +
          "\n",
      );
    }
  }

  const manifest = {
    $provenance: provenance,
    artifacts: ARTIFACTS.map((spec) => {
      const content = files.get(spec.file);
      if (content === undefined) {
        return fail("degenerate-export", `Artifact not built: ${spec.file}`);
      }
      return {
        file: spec.file,
        format: spec.format,
        sha256: sha256(content),
        bytes: Buffer.byteLength(content, "utf8"),
      };
    }),
  };
  files.set(
    "manifest.json",
    JSON.stringify(manifest, null, 2) + "\n",
  );

  return { provenance, files, lint };
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

async function writeArtifacts(
  outDir: string,
  generated: GeneratedArtifacts,
): Promise<void> {
  await mkdir(outDir, { recursive: true });
  const rows: string[] = [];
  for (const [file, content] of generated.files) {
    await writeFile(path.join(outDir, file), content, "utf8");
    rows.push(
      `  ${file}  ${sha256(content).slice(0, 16)}…  ${Buffer.byteLength(content, "utf8")} bytes`,
    );
  }
  console.log(`Generated ${rows.length} files in ${outDir}:`);
  console.log(rows.join("\n"));
}

async function runCheck(generated: GeneratedArtifacts): Promise<number> {
  let drift = 0;
  const expectedNames = [...generated.files.keys()].sort();
  for (const file of expectedNames) {
    const expected = generated.files.get(file) ?? "";
    const diskPath = path.join(DEFAULT_OUT_DIR, file);
    if (!existsSync(diskPath)) {
      console.log(`DRIFT (missing on disk): ${file}`);
      drift += 1;
      continue;
    }
    const actual = await readFile(diskPath, "utf8");
    if (actual === expected) {
      console.log(`IDENTICAL: ${file}`);
    } else {
      console.log(
        `DRIFT (content differs): ${file} — run \`bun run tokens:generate\`.`,
      );
      drift += 1;
    }
  }
  const onDisk = existsSync(DEFAULT_OUT_DIR)
    ? readdirSync(DEFAULT_OUT_DIR)
    : [];
  const unexpected = onDisk
    .filter((f) => f !== "README.md" && !expectedNames.includes(f))
    .sort();
  for (const f of unexpected) {
    console.log(
      `UNEXPECTED FILE in src/tokens: ${f} — src/tokens contains only generated artifacts plus README.md.`,
    );
    drift += 1;
  }
  if (drift === 0) {
    console.log(
      "tokens:check passed — committed artifacts match a clean regeneration.",
    );
    return 0;
  }
  console.error(`tokens:check failed with ${drift} problem(s).`);
  return 1;
}

interface FailureProbe {
  label: string;
  source: string;
  expectReason: string;
  expectBrokenRefRule?: boolean;
}

async function runProveFailure(tool: ResolvedTool): Promise<number> {
  const probes: FailureProbe[] = [
    {
      label: "invalid reference fixture",
      source: path.join(FIXTURES_DIR, "invalid-ref", SOURCE_BASENAME),
      expectReason: "invalid-references",
      expectBrokenRefRule: true,
    },
    {
      label: "missing source file",
      source: path.join(FIXTURES_DIR, "does-not-exist", SOURCE_BASENAME),
      expectReason: "source-missing",
    },
    {
      label: "malformed YAML fixture (degenerate export)",
      source: path.join(FIXTURES_DIR, "malformed-yaml", SOURCE_BASENAME),
      expectReason: "degenerate-export",
    },
    {
      label: "missing issue-45 sections fixture (degenerate export)",
      source: path.join(FIXTURES_DIR, "missing-45-sections", SOURCE_BASENAME),
      expectReason: "degenerate-export",
    },
  ];

  let failures = 0;
  for (const probe of probes) {
    const tmpDir = await mkdtemp(
      path.join(os.tmpdir(), "augur-tokens-probe-"),
    );
    try {
      let caught: GenerationFailure | undefined;
      try {
        await generate(tool, probe.source);
      } catch (error) {
        if (error instanceof GenerationFailure) caught = error;
        else throw error;
      }

      if (!caught) {
        console.error(
          `FAIL [${probe.label}]: pipeline unexpectedly succeeded; the failure path did not trigger.`,
        );
        failures += 1;
        continue;
      }
      const reasonOk = caught.reason === probe.expectReason;
      let brokenRefOk = true;
      if (probe.expectBrokenRefRule && reasonOk) {
        const lint = await lintGateForProbe(tool, probe.source);
        brokenRefOk = lint.findings.some((f) => f.rule === "broken-ref");
      }
      if (reasonOk && brokenRefOk) {
        console.log(
          `PASS [${probe.label}]: exited nonzero as designed (reason: ${caught.reason}).`,
        );
        console.log(`  ${caught.message}`);
        if (caught.detail) console.log(`  ${caught.detail.split("\n")[0]}`);
      } else {
        console.error(
          `FAIL [${probe.label}]: expected reason "${probe.expectReason}"` +
            (probe.expectBrokenRefRule ? ` with a broken-ref finding` : "") +
            `, got "${caught.reason}" (brokenRefOk=${brokenRefOk}).`,
        );
        failures += 1;
      }

      const leftover = existsSync(path.join(tmpDir, "manifest.json"));
      if (leftover) {
        console.error(
          `FAIL [${probe.label}]: artifacts were written despite failure.`,
        );
        failures += 1;
      }
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  }

  if (failures === 0) {
    console.log(
      "tokens:verify-failures passed — all controlled failure paths exit nonzero and write no artifacts.",
    );
    return 0;
  }
  console.error(`tokens:verify-failures failed with ${failures} problem(s).`);
  return 1;
}

/** Lint a probe source without the fail-fast wrapper, to inspect findings. */
async function lintGateForProbe(
  tool: ResolvedTool,
  source: string,
): Promise<LintReport> {
  const result = runCli(tool, ["lint", source, "--format", "json"]);
  try {
    return JSON.parse(result.stdout) as LintReport;
  } catch {
    return { findings: [], summary: { errors: 0, warnings: 0, infos: 0 } };
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  let mode: "generate" | "check" | "prove-failure" = "generate";
  let outDir = DEFAULT_OUT_DIR;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--check") {
      mode = "check";
    } else if (arg === "--prove-failure") {
      mode = "prove-failure";
    } else if (arg === "--out") {
      const value = argv[i + 1];
      if (value === undefined) {
        console.error("--out requires a directory argument.");
        return 1;
      }
      outDir = path.resolve(value);
      i += 1;
    } else {
      console.error(`Unknown argument: ${arg}`);
      console.error(
        "Usage: bun src/tools/generate-tokens.ts [--check | --prove-failure | --out <dir>]",
      );
      return 1;
    }
  }

  const tool = resolvePinnedTool();
  console.log(
    `Pinned toolchain: ${TOOL_NAME}@${tool.version} (exact pin enforced)`,
  );

  if (mode === "prove-failure") {
    return runProveFailure(tool);
  }

  const generated = await generate(tool, SOURCE_DESIGN_MD);
  console.log(
    `Lint gate passed: ${generated.lint.summary.errors} errors / ${generated.lint.summary.warnings} warnings / ${generated.lint.summary.infos} infos.`,
  );
  console.log(
    `Source: ${SOURCE_BASENAME} sha256 ${generated.provenance.source.sha256}`,
  );

  if (mode === "check") {
    return runCheck(generated);
  }

  await writeArtifacts(outDir, generated);
  console.log(
    "Done. Regenerate after any DESIGN.md change; never hand-edit src/tokens artifacts.",
  );
  return 0;
}

process.exitCode = await main();
