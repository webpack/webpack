"use strict";

const { SharePlugin } = require("../../../../").sharing;

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		uniqueName: "b"
	},
	plugins: [
		new SharePlugin({
			shared: ["package"]
		})
	]
};
