"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	experiments: { moduleSplitting: true },
	optimization: { minimize: false, concatenateModules: false }
};
