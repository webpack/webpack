"use strict";

const ns = require("../targets/cjs?deep");
exports.x = ns.nested.x;
exports.nested = ns.nested;
exports.info = ns.usedExports;
