"use strict";

const { SharePlugin } = require("../../../../").sharing;

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	plugins: [
		new SharePlugin({
			shared: ["shared"]
		})
	]
};
