"use strict";

module.exports = () => {
	const majorVersion = Number.parseInt(process.versions.node.split(".")[0], 10);
	return majorVersion >= 14;
};
