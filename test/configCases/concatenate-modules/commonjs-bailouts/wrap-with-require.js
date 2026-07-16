"use strict";

// A reassigning ("weird") module that also require()s another module must bail:
// wrapping keeps its module ids, so an inlined require target would break.
const dep = require("./sloppy");
module.exports = { s: dep.s };
