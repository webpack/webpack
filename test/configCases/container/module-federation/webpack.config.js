const ModuleFederationPlugin = require("../../../../lib/container/ModuleFederationPlugin");

function createConfig() {
	return {
		output: {
			libraryTarget: "system"
		},
		//externalsType: "system",
		module: {
			rules: [
				{
					test: /\.js$/,
					parser: {
						system: false
					}
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
