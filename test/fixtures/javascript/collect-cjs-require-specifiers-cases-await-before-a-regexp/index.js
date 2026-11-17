async function f() { await /require\("\.\/nope"\)/.test(s); }
require("./a");