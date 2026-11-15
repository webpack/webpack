const path = require("./dir/a.js");
exports.value = 1;
Object.defineProperty(exports, "defined", { enumerable: true, value: 2 });
this.viaThis = true;
module.exports.path = path;
module.exports.resolved = require.resolve("./dir/b.js");
module.exports.weak = require.resolveWeak("./dir/b.js");
