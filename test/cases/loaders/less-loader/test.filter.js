"use strict";

const majorVersion = Number.parseInt(process.versions.node.split(".")[0], 10);

const supportsRequireInModule = require("../../../helpers/supportsRequireInModule");

module.exports = (config) =>
	majorVersion >= 18 && (!config.module || supportsRequireInModule());
