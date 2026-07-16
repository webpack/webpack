"use strict";

exports.name = "a";
const b = require("./circular-b");
exports.bName = b.name;
