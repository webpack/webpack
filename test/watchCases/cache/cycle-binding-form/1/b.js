// read while a.js is still evaluating, so only bindings defined up front show
exports.keys = Object.keys(require("./a.js")).sort();
