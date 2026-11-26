"use strict";

const { DefinePlugin } = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	plugins: [
		new DefinePlugin({
			"import.meta.env": "global.CUSTOM_META_ENV",
			"import.meta.env.B": JSON.stringify("b")
		})
	]
};
