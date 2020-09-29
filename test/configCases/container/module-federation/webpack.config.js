const { ModuleFederationPlugin } = require("../../../../").container;

function createConfig() {
	return {
		output: {
			libraryTarget: "system"
		},
		plugins: [
			new ModuleFederationPlugin({
				name: "container",
				filename: "container.js",
				library: { type: "system" },
				exposes: ["./other", "./self", "./dep"],
				remotes: {
					abc: "ABC",
					def: "DEF",
					self: "./container.js",
					other: "./container2.js"
				}
			}),
			new ModuleFederationPlugin({
				name: "container2",
				filename: "container2.js",
				library: { type: "system" },
				exposes: ["./other", "./self", "./dep"],
				remotes: {
					abc: "ABC",
					def: "DEF",
					self: "./container2.js",
					other: "./container.js"
				}
			})
		]
	};
}

module.exports = createConfig();
