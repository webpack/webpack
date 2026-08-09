"use strict";

const supportsRequireInModule = require("../../../helpers/supportsRequireInModule");

// Reads the emitted bundle back through `__non_webpack_require__("fs")`, which the
// browser targets rightly warn about, and which ESM output builds from `node:module`.
module.exports = (config) =>
	supportsRequireInModule() &&
	(config.target === "node" ||
		config.target === "async-node" ||
		config.target === "universal");
