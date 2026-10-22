"use strict";

// a compound assignment combines with the current value, so it is no re-export
const ns = require("../targets/cjs?compound");
exports.appended = "x";
exports.appended += ns.a;
exports.direct = "y";
exports.direct += require("../targets/cjs?compound").c;
module.exports.viaModule = "z";
module.exports.viaModule += ns.b;
exports.counter = 1;
exports.counter *= ns.nested.x === "x" ? 3 : 0;
