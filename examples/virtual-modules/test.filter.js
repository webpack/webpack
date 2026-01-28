"use strict";

module.exports = () => {
	const nodeVersionMajor = Number.parseInt(
		process.version.slice(1).split(".")[0],
		10
	);

	return nodeVersionMajor >= 14;
};
