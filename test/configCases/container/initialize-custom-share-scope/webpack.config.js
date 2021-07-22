const { ModuleFederationPlugin } = require("../../../../").container;

/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		plugins: [
			new ModuleFederationPlugin({
				name: "container1",
				filename: "container1.js",
				library: { type: "commonjs-module" },
				exposes: ["./module"],
				shared: {
					package: {
						version: "1.0.0",
						requiredVersion: "1.0.0",
						shareScope: "example"
					}
				}
			})
		]
	},
	{
		plugins: [
			new ModuleFederationPlugin({
				name: "container2",
				filename: "container2.js",
				library: { type: "commonjs-module" },
				exposes: ["./module"],
				shared: {
					package: {
						version: "1.0.0",
						requiredVersion: "1.0.0",
						shareScope: "example"
					}
				}
			})
		]
	}
];
