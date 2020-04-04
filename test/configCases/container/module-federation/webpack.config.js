const ModuleFederationPlugin = require("../../../../lib/container/ModuleFederationPlugin");

function createConfig() {
	return {
		output: {
			libraryTarget: "system"
		},
		externalsType: "system",
		name: `system_js_build`,
		module: {
			rules: [
				{
					test: /\.js$/
				}
			]
		},
		plugins: [
			new ModuleFederationPlugin({
				name: "container",
				filename: "container.js",
				remotes: {
					abc: "ABC",
					def: "DEF"
				}
			})
		]
	};
}

module.exports = createConfig();
