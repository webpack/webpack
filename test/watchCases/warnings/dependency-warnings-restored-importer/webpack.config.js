"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	cache: { type: "memory" },
	devtool: false,
	optimization: { minimize: false, emitOnErrors: true }
};
