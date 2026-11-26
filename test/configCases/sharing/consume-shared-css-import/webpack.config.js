"use strict";

const { ConsumeSharedPlugin } = require("../../../../").sharing;

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	node: { __dirname: false },
	experiments: { css: true },
	plugins: [new ConsumeSharedPlugin({ consumes: { "shared-styles": {} } })]
};
