// Workaround for constrained Windows sandboxes where uv_os_get_passwd fails.
const os = require("node:os");
const original = os.userInfo;
os.userInfo = (...args) => {
  try { return original(...args); }
  catch { return { uid: -1, gid: -1, username: "codex", homedir: process.cwd(), shell: null }; }
};
