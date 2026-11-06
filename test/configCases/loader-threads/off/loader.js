"use strict";

/** @type {import("../../../../").LoaderDefinition<{ value: number }>} */
module.exports = function () {
	const { isMainThread } = require("worker_threads");

	if (!isMainThread) {
		throw new Error("loader should run on the main thread when threads are off");
	}

	const options = this.getOptions();

	return `module.exports = ${JSON.stringify(`main:${options.value}`)};`;
};
