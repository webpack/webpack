"use strict";

module.exports = config =>
	// This test can't run in development mode as it depends on the flagIncludedChunks optimization
	config.mode !== "development";
