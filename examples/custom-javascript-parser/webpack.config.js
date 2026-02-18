"use strict";

const acornParse = require("./internals/acorn-parse.js");
const meriyahParse = require("./internals/meriyah-parse.js");
const oxcParse = require("./internals/oxc-parse.js");

/** @type {import("webpack").Configuration[]} */
const config = [
	// oxc
	{
		entry: "./example.js",
		mode: "production",
		optimization: {
			chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
		},
		output: {
			filename: "oxc.[name].js"
		},
		module: {
			// Global override
			parser: {
				javascript: {
					parse: oxcParse
				}
			}
			// Override on the module level, only for modules which match the `test`
			// rules: [
			// 	{
			// 		test: /\.js$/,
			// 		parser: {
			// 			parse: oxcParse
			// 		}
			// 	}
			// ]
		}
	},
	// meriyah
	{
		entry: "./example.js",
		mode: "production",
		optimization: {
			chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
		},
		output: {
			filename: "meriyah.[name].js"
		},
		module: {
			// Global override
			parser: {
				javascript: {
					parse: meriyahParse
				}
			}
			// Override on the module level, only for modules which match the `test`
			// rules: [
			// 	{
			// 		test: /\.js$/,
			// 		parser: {
			// 			parse: meriyahParse
			// 		}
			// 	}
			// ]
		}
	},
	// acorn
	{
		entry: "./example.js",
		mode: "production",
		output: {
			filename: "acorn.[name].js"
		},
		optimization: {
			chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
		},
		module: {
			// Global override
			parser: {
				javascript: {
					parse: acornParse
				}
			}
			// Override on the module level, only for modules which match the `test`
			// rules: [
			// 	{
			// 		test: /\.js$/,
			// 		parser: {
			// 			parse: acornParse
			// 		}
			// 	}
			// ]
		}
	}
];

module.exports = config;
