"use strict";

module.exports = function filter() {
	const major = Number(process.versions.node.split(".")[0]);
	return major >= 20;
};
