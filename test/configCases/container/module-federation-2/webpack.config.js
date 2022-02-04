const { ModuleFederationPlugin } = require("../../../../").container;

function createConfig() {
	return {
		plugins: [
			new ModuleFederationPlugin({
				name: "hostContainer",
				filename: "host-container.js",
				exposes: {
					"./hostHelper": { import: "./hostHelper", shared: true }
				},
				remotes: {
					plugin: "./container.js"
				}
			}),
			new ModuleFederationPlugin({
				name: "container",
				filename: "container.js",
				remotes: {
					hostContainer: "hostContainer@host"
				}
			})
		]
	};
}

module.exports = createConfig();
