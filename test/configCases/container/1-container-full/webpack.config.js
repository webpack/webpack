const ModuleFederationPlugin = require("../../../../lib/container/ModuleFederationPlugin");

module.exports = {
	plugins: [
		new ModuleFederationPlugin({
			name: "container",
			library: { type: "commonjs-module" },
			filename: "container.js",
			exposes: {
				ComponentB: "./ComponentB"
			},
			remotes: {
				containerA: "../0-container-full/container.js",
				containerB: "./container.js"
			},
			shared: ["react"]
		})
	]
};
