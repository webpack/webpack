"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	experiments: {
		lazyCompilation: {
			entries: false,
			imports: true,
			backend: {
				listen: {
					host: "127.0.0.1"
				}
			}
		}
	}
};
