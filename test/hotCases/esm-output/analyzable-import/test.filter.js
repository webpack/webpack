"use strict";

// Reads the emitted bundle back through `__non_webpack_require__("fs")`, which the
// browser targets rightly warn about. The emitted form itself is target-independent.
module.exports = (config) =>
	config.target === "node" ||
	config.target === "async-node" ||
	config.target === "universal";
