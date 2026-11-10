"use strict";

/** @type {import("webpack").Configuration[]} */
module.exports = [
	{ concatenateModules: false, minimize: false },
	{ concatenateModules: true, minimize: false },
	{ concatenateModules: false, minimize: true },
	{ concatenateModules: true, minimize: true }
].map((optimization, index) => ({
	mode: "production",
	output: { filename: `bundle.${index}.js` },
	optimization: { inlineExports: true, ...optimization }
}));
