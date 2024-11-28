const { ModuleFederationPlugin } = require("../../../../").container;

/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		entry: {
			main: {
				import: "./index.js",
				dependOn: ["somethingElse"]
			},
			somethingElse: {
				import: ["./other.js"]
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
