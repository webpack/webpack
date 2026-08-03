"use strict";

exports.used = "used";
// neither alias is ever read, but the require() behind it still has to run
exports.unusedMember = require("./side.js").name;
exports.unusedWhole = require("./whole.js");
