const other = require("./othercyc");

exports.x = 1;
// Reads its own exports, which is a dependency on the module itself.
exports.y = module.exports.x + 1;
exports.getOther = () => other.other;
