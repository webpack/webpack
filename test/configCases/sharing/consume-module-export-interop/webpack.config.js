"use strict";

const { ConsumeSharedPlugin, ProvideSharedPlugin } =
	require("../../../../").sharing;

/** @type {import("../../../../").Configuration} */
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
