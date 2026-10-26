"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

// Universal workers resolve worker_threads through process.getBuiltinModule.
module.exports = () =>
	supportsWorker() &&
	typeof process.getBuiltinModule === "function" &&
	!process.versions.bun;
