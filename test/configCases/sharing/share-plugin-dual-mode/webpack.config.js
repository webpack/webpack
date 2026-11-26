"use strict";

const path = require("path");
const { SharePlugin } = require("../../../../").sharing;

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	context: path.resolve(__dirname, "./cjs"),
	plugins: [
		new SharePlugin({
			shared: {
				lib: {},
				transitive_lib: {}
			}
		})
	]
};
