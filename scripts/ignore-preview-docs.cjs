// Vercel: 0 skips the build, 1 builds. Only explicitly marked, docs-only Preview commits qualify.
const { execFileSync } = require('node:child_process');
try {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== 'feat/saas-multitenant') process.exit(1);
  const message = execFileSync('git', ['log', '-1', '--format=%B'], { encoding: 'utf8' });
  if (!message.includes('[skip preview docs]')) process.exit(1);
  const changed = execFileSync('git', ['diff', '--name-only', 'HEAD^', 'HEAD'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  process.exit(changed.length > 0 && changed.every(path => path.startsWith('docs/') && path.endsWith('.md')) ? 0 : 1);
} catch { process.exit(1); }
