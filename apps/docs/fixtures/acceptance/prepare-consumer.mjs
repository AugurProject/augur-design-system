/** Prepare ONLY the disposable app retained by consumer-smoke.ts --keep. */
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const app=process.argv[2];
if (!app) throw new Error('Pass the disposable consumer app directory');
const repo=resolve(import.meta.dirname,'../../../..');
const example=join(repo,'apps/docs/src/examples/patterns');
const record=(await readFile(join(example,'reference-record.tsx'),'utf8')).replace('"@augurproject/design-system"','"@/components/ui/button"');
await writeFile(join(app,'src/reference-record.tsx'),record);
await copyFile(join(example,'reference-record.css'),join(app,'src/reference-record.css'));
await writeFile(join(app,'src/App.tsx'),`import { ReferenceRecordExample } from './reference-record';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
export default function App(){return <main style={{maxWidth:736,margin:'32px auto',padding:'0 24px'}}>
<h1 className="augur-type-editorial-title">Independent source consumer</h1>
<p className="augur-type-body">Installed components and the same record composition. No docs stylesheet or workspace imports.</p>
<Card><CardHeader><CardTitle>Consumer parity</CardTitle></CardHeader><CardContent><Button variant="outline">Review</Button><Input aria-label="Query" placeholder="Query identifier" /></CardContent></Card>
<ReferenceRecordExample />
</main>}
`);
console.log(`Prepared ${app}; serve with bunx vite --host 127.0.0.1 --port 4340.`);
