"use strict";

// the same fixture built once per variant
module.exports = [...require("./digest.config"), ...require("./xxhash.config")];
