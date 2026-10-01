"use strict";

const ns = require("../targets/cjs?nested-call");
exports.called = ns.fn();
exports.fn = ns.fn;
exports.computed = ns["a"];
exports.dynamicKey = ns[["b"][0]];
