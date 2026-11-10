import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import("../../..").Configuration} */
export default {
	entry: "./generated/index.js",
	target: "web",
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
		filename: "[name].[contenthash].js",
		chunkFilename: "[name].[contenthash].js",
		assetModuleFilename: "[name].[contenthash][ext]"
	}
};
