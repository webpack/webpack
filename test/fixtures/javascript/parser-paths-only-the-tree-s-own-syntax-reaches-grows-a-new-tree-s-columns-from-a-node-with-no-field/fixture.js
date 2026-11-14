"use strict";

// a tree past its reuse capacity, so the next parse starts with no columns
module.exports.source = () => "x;".repeat(140000);
