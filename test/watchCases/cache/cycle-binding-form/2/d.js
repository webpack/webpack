// read while c.js is still evaluating, so only bindings defined up front show
exports.keys = Object.keys(require("./c.js"));
