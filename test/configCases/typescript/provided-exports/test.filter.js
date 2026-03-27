"use strict";

const majorVersion = Number.parseInt(
	process.version.slice(1).split(".")[0],
	10
);

module.exports = () => majorVersion >= 22;
