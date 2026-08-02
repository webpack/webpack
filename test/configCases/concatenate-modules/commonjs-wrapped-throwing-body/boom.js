"use strict";

require("./counter").bump();

exports.partial = 1;

throw new Error("boom");
