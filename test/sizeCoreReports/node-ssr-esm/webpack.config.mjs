import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import("../../..").Configuration} */
export default {
	entry: "./generated/server.js",
	target: "node",
	experiments: {
		css: true
	},
	module: {
		rules: [{ test: /\.svg$/, type: "asset" }]
	},
	resolve: {
		alias: {
			"@": resolve(__dirname, "generated")
		}
	},
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		assetModuleFilename: "[name].[contenthash][ext]"
	}
};
