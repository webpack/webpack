"use strict";

// the same fixture built once per variant
module.exports = [
	...require("./deterministic-module-ids.config"),
	...require("./hashed-module-ids.config")
];
