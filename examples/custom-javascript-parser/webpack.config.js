"use strict";

const acornParse = require("./internals/acorn-parse");
const meriyahParse = require("./internals/meriyah-parse");
const oxcParse = require("./internals/oxc-parse");
const swcNextParse = require("./internals/swc-next-parse.mjs").default;

/** @import { Configuration } from "webpack" */

/** @type {Configuration[]} */
const config = [
	// oxc
	{
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
	// swc-next
	{
		mode: "production",
		optimization: {
			chunkIds: "deterministic"
		},
		output: {
			filename: "swc-next.[name].js"
		},
		module: {
			parser: {
				javascript: {
					parse: swcNextParse
				}
			}
		}
	},
	// meriyah
	{
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
