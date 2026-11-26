"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		importMetaName: "pseudoImport.meta"
	},
	module: {
		parser: {
			javascript: {
				importMeta: false
			}
		}
	}
};
