const { ModuleFederationPlugin } = require("../../../../").container;

/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		entry: "./index.js",
		target: "node",
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
