"custom";
// a dead block keeps hoisting `g` only where the module is sloppy
if (false) { function g() {} }
module.exports = (function () { try { g; return false; } catch (_e) { return true; } })();
