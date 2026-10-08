import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

// Validate the production import graph. Historical scene experiments remain
// available for reference and can be inspected with `npm run lint`.
const root = fileURLToPath(new URL('../', import.meta.url));
const files = new Set();
function visit(file) {
    if (files.has(file)) return;
    files.add(file);
    const source = fs.readFileSync(file, 'utf8');
    for (const [, spec] of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g)) {
        const base = path.resolve(path.dirname(file), spec);
        const target = [base, base + '.js', base + '.jsx', path.join(base, 'index.js')]
            .find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
        if (target && /\.jsx?$/.test(target)) visit(target);
    }
}
for (const entry of ['src/main.jsx', 'seo-plugin.js', 'vite.config.js', 'public/start/script.js']) {
    visit(path.join(root, entry));
}
const eslint = new ESLint({ cwd: root });
const results = await eslint.lintFiles([...files].sort());
const formatter = await eslint.loadFormatter('stylish');
const diagnostics = formatter.format(results);
if (diagnostics) console.log(diagnostics);
const errors = results.reduce((sum, result) => sum + result.errorCount, 0);
const warnings = results.reduce((sum, result) => sum + result.warningCount, 0);
console.log(`Production app lint: ${results.length} files, ${errors} errors, ${warnings} warnings.`);
if (errors) process.exitCode = 1;
