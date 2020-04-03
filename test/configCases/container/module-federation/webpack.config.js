const ModuleFederationPlugin = require("../../../../lib/container/ModuleFederationPlugin");

module.exports = {
	externalsType: "system",
	plugins: [
		new ModuleFederationPlugin({
			name: "container",
			library: { type: "commonjs-module" },
			filename: "container.js",
			exposes: {
				ComponentA: "./ComponentA"
			},
			remotes: {
				containerA: "./container.js"
			},
			shared: ["react"]
		})
	]
};
