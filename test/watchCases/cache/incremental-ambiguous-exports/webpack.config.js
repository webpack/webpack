"use strict";

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "development",
	experiments: { incremental: true },
	optimization: { sideEffects: false, concatenateModules: false }
};
