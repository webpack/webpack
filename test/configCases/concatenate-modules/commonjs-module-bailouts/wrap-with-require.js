"use strict";

// A reassigning module with a require() of a non-concatenatable target: the
// module wraps and the require falls back to the target's module id.
const dep = require("./sloppy");
module.exports = { s: dep.s };
