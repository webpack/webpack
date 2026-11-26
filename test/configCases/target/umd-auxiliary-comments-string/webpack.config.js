"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		library: "NamedLibrary",
		libraryTarget: "umd",
		umdNamedDefine: true,
		auxiliaryComment: "test comment"
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
