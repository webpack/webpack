"use strict";

module.exports = () =>
	// In node 10 v8 has a bug which inserts an additional micro-tick into async functions
	!process.version.startsWith("v10.");
