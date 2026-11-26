"use strict";

/** @import { Configuration } from "webpack" */

/** @type {Configuration} */
const config = {
	optimization: {
		chunkIds: "named" // To keep filename consistent between different modes (for example building only)
	}
};

module.exports = config;
