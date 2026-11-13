"use strict";

const supportsLogicalAssignment = require("../../../helpers/supportsLogicalAssignment");

module.exports = (config) =>
	// usedExports analysis only runs outside development mode.
	config.mode !== "development" && supportsLogicalAssignment();
