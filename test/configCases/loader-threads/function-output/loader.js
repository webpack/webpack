"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	const ranInWorker = !this._compiler || this._compiler.hooks === undefined;

	return `module.exports = ${JSON.stringify(
		ranInWorker ? "worker" : "main"
	)};`;
};
