"use strict";

const path = require("path");

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	const callback = this.async();
	this.importModule(
		path.resolve(__dirname, "module.js"),
		{ baseUri: "webpack://" },
		(error, exports) => {
			if (error) {
				callback(error);
				return;
			}

			callback(
				null,
				`module.exports = ${
					exports.asset ? JSON.stringify(exports.asset) : undefined
				}`
			);
		}
	);
};
