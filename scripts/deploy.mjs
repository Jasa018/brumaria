// Publica dist/ en la rama gh-pages (GitHub Pages). Uso: npm run deploy
import { execSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';

const sh = (cmd, cwd) => execSync(cmd, { stdio: 'inherit', cwd });
const remote = execSync('git remote get-url origin').toString().trim();

sh('npm run build');
if (!existsSync('dist/index.html')) throw new Error('No se generó dist/index.html');
writeFileSync('dist/.nojekyll', '');
sh('git init -q -b gh-pages', 'dist');
sh('git add -A', 'dist');
sh('git -c user.name="deploy" -c user.email="deploy@local" commit -qm "Publicar"', 'dist');
sh(`git push -f -q "${remote}" gh-pages`, 'dist');
console.log('Publicado. GitHub Pages tarda ~1 minuto en actualizarse.');
