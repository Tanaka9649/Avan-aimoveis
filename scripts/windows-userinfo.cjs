// Workaround for constrained Windows sandboxes where uv_os_get_passwd fails.
// Node preload scripts run as CommonJS before Next.js starts.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const os = require("node:os");
const original = os.userInfo;
os.userInfo = (...args) => {
  try { return original(...args); }
  catch { return { uid: -1, gid: -1, username: "codex", homedir: process.cwd(), shell: null }; }
};
