"use strict";

const { DefinePlugin } = require("../../../../");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @import { Configuration } from "../../../../" */

const step = () => Number(currentWatchStep.step);

const definitions = [
	{ FIRST: '"one"' },
	{ FIRST: '"one"', SECOND: '"two"' },
	{ SECOND: '"two"' }
];

/** @type {Configuration} */
module.exports = {
	mode: "production",
	cache: { type: "filesystem" },
	optimization: { minimize: false },
	plugins: [
		(compiler) => {
			new DefinePlugin(definitions[step()]).apply(compiler);
		}
	]
};
