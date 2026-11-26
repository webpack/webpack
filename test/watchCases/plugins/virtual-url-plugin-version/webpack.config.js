"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @import { Configuration } from "../../../../types.d.ts" */

const { VirtualUrlPlugin } = webpack.experiments.schemes;

let watchStep = -1;

/** @type {Configuration} */
module.exports = {
	plugins: [
		new VirtualUrlPlugin({
			routes: {
				source: () =>
					fs.readFileSync(path.join(__dirname, `./${watchStep}/v.js`), "utf8"),
				version: () => {
					watchStep += 1;
					return `v${watchStep}`;
				}
			},
			watchStep: {
				source: () => `export const watchStep = ${watchStep}`,
				version: true
			},
			constStep: {
				source: () => `export const constStep = ${watchStep}`
			}
		})
	]
};
