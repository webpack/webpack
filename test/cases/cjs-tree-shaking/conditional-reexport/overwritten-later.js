"use strict";

exports.value = require("./a?overwritten-later");
exports.value = 5;
