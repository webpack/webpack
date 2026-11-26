"use strict";

const { ConsumeSharedPlugin, ProvideSharedPlugin } =
	require("../../../../").sharing;

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	plugins: [
		new ProvideSharedPlugin({
			provides: {
				cjs: {
					version: "0.0.0"
				}
			}
		}),
		new ConsumeSharedPlugin({
			consumes: {
				cjs: {
					requiredVersion: "0.0.0"
				}
			}
		})
	]
};
