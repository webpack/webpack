const { ModuleFederationPlugin } = require("../../../../").container;

function createConfig() {
	return {
		output: {
			filename: "[name].js"
		},
		plugins: [
			new ModuleFederationPlugin({
				name: "container",
				library: { type: "commonjs-module" },
				exposes: ["./a"],
				remotes: {
					container2:
						"promise Promise.resolve().then(() => require('./container2.js'))"
				}
			}),
			new ModuleFederationPlugin({
				name: "container2",
				library: { type: "commonjs-module" },
				exposes: ["./b"],
				remotes: {
					container:
						"promise Promise.resolve().then(() => require('./container.js'))"
				}
			})
		]
	};
}

module.exports = createConfig();
