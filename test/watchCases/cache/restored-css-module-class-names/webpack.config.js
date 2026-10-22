"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	cache: { type: "filesystem" },
	target: "node",
	experiments: { css: true },
	optimization: { minimize: false }
};
