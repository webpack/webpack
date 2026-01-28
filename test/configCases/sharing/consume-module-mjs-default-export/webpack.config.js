"use strict";

const { ConsumeSharedPlugin, ProvideSharedPlugin } =
	require("../../../../").sharing;

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	plugins: [
		new ProvideSharedPlugin({
			provides: {
				"shared-esm-pkg": {
					version: "1.0.0"
				}
			}
		}),
		new ConsumeSharedPlugin({
			consumes: {
				"shared-esm-pkg": {
					requiredVersion: "^1.0.0"
				}
			}
		})
	]
};
