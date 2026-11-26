"use strict";

/** @import { Configuration } from "webpack" */

/** @type {Configuration} */
const config = {
	optimization: {
		chunkIds: "named"
	}
};

module.exports = config;
