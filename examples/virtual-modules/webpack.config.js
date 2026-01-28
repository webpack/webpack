"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../");

const routesPath = path.join(__dirname, "./routes");

const VERSION = "1.0.0";

/** @type {(env: "development" | "production") => import("webpack").Configuration} */
const config = (env = "development") => ({
	mode: env,
	// Just for examples, you can use any target
	target: "node",
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				loader: "ts-loader",
				options: {
					transpileOnly: true
				}
			}
		]
	},
	plugins: [
		new webpack.experiments.schemes.VirtualUrlPlugin({
			"my-module": 'export const msg = "from virtual module"',
			"my-async-module": async () => {
				const value = await Promise.resolve("async-value");

				return `export default "${value}"`;
			},
			"build-info": {
				source() {
					return `export const version = "${VERSION}"`;
				},
				// Re-evaluate this value at each compilation, useful when getting a value from a variable
				version: true
			},
			"my-json-modules": {
				type: ".json",
				source: () => '{"name": "virtual-url-plugin"}'
			},
			// Loaders will work with virtual modules
			"my-typescript-module": {
				type: ".ts",
				source: () => `
const value: string = "value-from-typescript";

export default value;`
			},
			routes: {
				source(loaderContext) {
					// Use `loaderContext.addContextDependency` to monitor the addition or removal of subdirectories in routesPath to trigger the rebuilding of virtual modules.
					// See more - https://webpack.js.org/api/loaders/#the-loader-context
					loaderContext.addContextDependency(routesPath);

					const files = fs.readdirSync(routesPath);

					return `export const routes = {${files
						.map(
							(key) => `${key.split(".")[0]}: () => import('./routes/${key}')`
						)
						.join(",\n")}}`;
				}
			},
			"code-from-file": {
				async source(loaderContext) {
					const pathToFile = path.resolve(__dirname, "./code.js");

					// Will trigger rebuild on changes in the file
					loaderContext.addDependency(pathToFile);

					const code = await fs.promises.readFile(pathToFile, "utf8");

					return code;
				}
			}
		}),
		new webpack.experiments.schemes.VirtualUrlPlugin(
			{
				"my-module": `const msg = "from virtual module with custom scheme";

export default msg`
			},
			"my-custom-scheme"
		)
	]
});

module.exports = config;
