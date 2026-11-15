"use strict";

const supportsResponse = require("../../../helpers/supportsResponse");

// The web runners can't fetch a `.wasm` file by the `import.meta.url` an ES module
// output resolves it against.
module.exports = (config) =>
	supportsResponse() &&
	(config.target === "node" || config.target === "async-node");
