"use strict";

// only a `const` binding is tracked; reassignable ones are plain values
let viaLet = require("../targets/cjs?let");
var viaVar = require("../targets/cjs?var");
exports.viaLet = viaLet;
exports.viaVar = viaVar;
viaLet = { reassigned: true };
exports.afterReassign = viaLet;
