"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	experiments: { moduleSplitting: true },
	optimization: { minimize: true, concatenateModules: false }
};
