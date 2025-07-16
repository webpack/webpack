"use strict";

module.exports = config =>
	// This test can't run in development mode
	config.mode !== "development";
