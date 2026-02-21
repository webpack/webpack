"use strict";

module.exports = function supportsTypeBytes() {
	const [major] = process.versions.node.split(".").map(Number);

	return major >= 20;
};
