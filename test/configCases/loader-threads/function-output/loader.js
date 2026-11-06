"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	const { isMainThread } = require("worker_threads");

	return `module.exports = ${JSON.stringify(
		isMainThread ? "main" : "worker"
	)};`;
};
