"use strict";

const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		common: { import: "./common.js", filename: "common.js" },

		paid: { dependOn: "common", import: "./paid.js", layer: "paid" },
		free: { dependOn: "common", import: "./free.js", layer: "free" }
	},
	experiments: {
		layers: true
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				layerPaidCommon: {
					name: "layer-paid-common",
					layer: "paid",
					chunks: "async",
					enforce: true,
					reuseExistingChunk: true
				}
			}
		}
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		new DefinePlugin({
			FREE_VERSION: DefinePlugin.runtimeValue(
				(ctx) => ctx.module.layer === "free"
			)
		})
	]
};
