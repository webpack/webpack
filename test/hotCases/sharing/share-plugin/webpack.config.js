"use strict";

const { SharePlugin } = require("../../../../").sharing;

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	plugins: [
		new SharePlugin({
			shared: {
				common: {
					eager: true,
					import: "./common?1",
					requiredVersion: "1.1.1"
				},
				common2: {
					import: "./common?2",
					requiredVersion: "1.1.1"
				}
			}
		})
	]
};
