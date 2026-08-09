"use strict";

exports.used = "used";
exports.unused = "unused";
// a self-reference read: rewritten onto the exports object, like the write above
exports.readBack = `${exports.used}!`;
