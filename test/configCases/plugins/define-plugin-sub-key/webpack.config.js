"use strict";

const DefinePlugin = require("../../../../").DefinePlugin;

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	plugins: [
		new DefinePlugin({
			"foo.bar.baz": '"test"'
		})
	]
};
