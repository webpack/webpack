"use strict";

module.exports = () => {
	const [major] = process.versions.node.split(".").map(Number);

	return major >= 20;
};
