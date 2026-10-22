"use strict";

module.exports = () => {
	// meriyah's own package.json declares engines.node >= 20.0.0
	const [major] = process.versions.node.split(".").map(Number);

	return major >= 20;
};
