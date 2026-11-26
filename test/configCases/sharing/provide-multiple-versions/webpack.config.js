"use strict";

const { ProvideSharedPlugin } = require("../../../../").sharing;

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	plugins: [
		new ProvideSharedPlugin({
			provides: ["shared"]
		})
	]
};
