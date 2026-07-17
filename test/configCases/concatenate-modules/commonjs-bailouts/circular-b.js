"use strict";

exports.name = "b";
const a = require("./circular-a");
// a.name is already assigned when b runs; a.bName is not yet
exports.aNameAtLoad = a.name;
