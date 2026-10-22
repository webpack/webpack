"use strict";

// marked side-effect free in the config, so an unused re-export may drop it
const sef = require("../targets/side-effect-free");
exports.sef = sef;
exports.sefValue = sef.value;
exports.kept = "kept";
