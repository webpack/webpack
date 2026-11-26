"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		library: {
			type: "umd",
			name: "TestLib"
		}
	},
	externals: {
		util: "util"
	},
	externalsType: "umd",
	experiments: {
		lazyCompilation: {
			entries: false
		}
	}
};
