"use strict";

const meriyah = require("meriyah");

module.exports = {
	optimization: {
		chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
	},
	module: {
		parser: {
			javascript: {
				parse: (sourceCode, options) => {
					console.log(options)
					return meriyah.parse(sourceCode, options);
				}
			}
		}
	}
};
