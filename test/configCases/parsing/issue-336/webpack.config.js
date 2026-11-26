"use strict";

const ProvidePlugin = require("../../../../").ProvidePlugin;

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	plugins: [
		new ProvidePlugin({
			aaa: "aaa"
		})
	]
};
