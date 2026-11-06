"use strict";

/** @type {import("../../../../").LoaderDefinition<{ value: number, callback: () => string }>} */
module.exports = function () {
	const { isMainThread } = require("worker_threads");

	if (!isMainThread) {
		throw new Error("uncloneable options should run on the main thread");
	}

	const options = this.getOptions();

	return `module.exports = ${JSON.stringify(`main:${options.value}`)};`;
};
