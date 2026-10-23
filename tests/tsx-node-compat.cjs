// tsx falls back to os.userInfo() on Windows, which can fail in restricted
// service accounts. Supplying the POSIX probe keeps the test-only temp name
// deterministic; Unix already provides this function.
if (typeof process.geteuid !== "function") process.geteuid = () => 0;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const os = require("node:os");
const userInfo = os.userInfo;
os.userInfo = (...args) => {
  try { return userInfo(...args); } catch { return { username: "test" }; }
};
