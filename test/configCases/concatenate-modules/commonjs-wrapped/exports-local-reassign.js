"use strict";

// reassigning the local `exports` binding does NOT change module.exports
exports.keep = 1;
exports = { gone: 2 };
