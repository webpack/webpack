"use strict";

const path = require("path");
const config = require("../../esm-output/library-live-binding-async-registered-late/webpack.config");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	...config,
	context: path.resolve(
		__dirname,
		"../../esm-output/library-live-binding-async-registered-late"
	)
};
