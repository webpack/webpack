"use strict";

const { DefinePlugin } = require("../../../../");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @import { Configuration } from "../../../../" */

const step = () => Number(currentWatchStep.step);

/** @type {Configuration} */
module.exports = {
	mode: "production",
	cache: { type: "filesystem" },
	optimization: { minimize: false },
	plugins: [
		(compiler) => {
			new DefinePlugin({
				"process.env.PICK": JSON.stringify(`p${step()}`)
			}).apply(compiler);
		}
	]
};
