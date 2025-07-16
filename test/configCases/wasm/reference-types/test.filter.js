"use strict";

const supportsWebAssembly = require("../../../helpers/supportsWebAssembly");

module.exports = () => {
	const [major] = process.versions.node.split(".").map(Number);

	return major >= 18 && supportsWebAssembly();
};
