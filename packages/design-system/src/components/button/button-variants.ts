/**
 * Variant and size class mapping for Button (issue #11).
 *
 * Augur owns this API but keeps it shadcn-shaped: `buttonVariants` is
 * the plain-function analog of the upstream `cva` call — callable with
 * `{ variant, size }` and returning the full class string, including
 * the control typography role, so class-only consumers (and the future
 * registry source path, issue #16) get the same result by applying the
 * classes to a native `<button>`. No class-variance-authority
 * dependency: the matrix is small and the package's runtime
 * dependencies stay at the font packages.
 *
 * Classes resolve color exclusively through the semantic role custom
 * properties in `src/styles/theme.css`. Geometry values in
 * `button.css` are structural constants (spacing, control heights,
 * radius), not emitted tokens; see `docs/components.md` in this
 * package for the component contract.
 */

/** Visual intent of the button. shadcn-compatible set, Augur-owned. */
export type ButtonVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link";

/** Control size. `xl` is 48px with 16/24 labels (adopted from augur.net). */
export type ButtonSize = "sm" | "md" | "lg" | "xl";

export interface ButtonVariantsProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  default: "aug-button--default",
  secondary: "aug-button--secondary",
  destructive: "aug-button--destructive",
  outline: "aug-button--outline",
  ghost: "aug-button--ghost",
  link: "aug-button--link",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "aug-button--sm",
  md: "aug-button--md",
  lg: "aug-button--lg",
  xl: "aug-button--xl",
};

/** Full class string for the given variant and size (defaults: md). */
export function buttonVariants(props: ButtonVariantsProps = {}): string {
  const variant = props.variant ?? "default";
  const size = props.size ?? "md";
  return `aug-button augur-type-control ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]}`;
}
