"use strict";

const ns = require("../targets/cjs?twice");
exports.one = ns;
exports.two = ns;
exports.a1 = ns.a;
exports.a2 = ns.a;
