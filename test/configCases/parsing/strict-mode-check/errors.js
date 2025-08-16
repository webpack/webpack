"use strict";

module.exports = () =>
	// All strict mode violations are caught either by the parser or by StrictModeChecksPlugin
	Array.from({ length: 11 }, () => ({
		message: /(Module parse failed:|is not allowed in strict mode)/
	}));
