const { ModuleFederationPlugin } = require("../../../../").container;

/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		entry: {
			main: {
				import: "./index.js"
			}
		},
		target: "node",
		mode: "development",
		devtool: false,
		output: {
			uniqueName: "eager-async-test",
			library: {
				type: "commonjs-module"
			}
		},
		plugins: [
			new ModuleFederationPlugin({
				name: "container",
				filename: "container.js",
				async: true,
				exposes: {
					"./ComponentA": "./ComponentA"
				},
				shared: {
					react: {
						eager: false
					}
				}
			})
		]
	}
];
