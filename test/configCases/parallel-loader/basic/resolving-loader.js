"use strict";

const path = require("path");

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	const callback = this.async();

	// `resolve` has no worker-side implementation and is answered by the main thread
	this.resolve(this.context, "./resolved", (err, result) => {
		if (err) return callback(err);
		callback(
			null,
			`module.exports = ${JSON.stringify(path.basename(/** @type {string} */ (result)))};`
		);
	});
};
