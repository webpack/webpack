"use strict";

/** @type {import("../../../../").LoaderDefinition<{ value: number, callback: () => string }>} */
module.exports = function () {
	// The worker context carries a compiler snapshot; the main thread has the full one.
	const ranInWorker = !this._compiler || this._compiler.hooks === undefined;

	if (ranInWorker) {
		throw new Error("uncloneable options should run on the main thread");
	}

	const options = this.getOptions();

	return `module.exports = ${JSON.stringify(`main:${options.value}`)};`;
};
