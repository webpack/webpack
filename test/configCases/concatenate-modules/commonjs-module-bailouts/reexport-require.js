"use strict";

// whole re-export of another module (the React index.js shape) — has a
// require dependency, so it wraps-bails and keeps its runtime wrapper
module.exports = require("./sloppy");
