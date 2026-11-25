"use strict";

const majorVersion = Number.parseInt(
	process.versions.node.split(".", 1)[0],
	10
);

const supportsRequireInModule = require("../../../helpers/supportsRequireInModule");

module.exports = (config) =>
	majorVersion >= 16 && (!config.module || supportsRequireInModule());
