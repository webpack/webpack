"use strict";

const { HotModuleReplacementPlugin } = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	devtool: false,
	optimization: { usedExports: false, sideEffects: false },
	plugins: [new HotModuleReplacementPlugin()]
};
