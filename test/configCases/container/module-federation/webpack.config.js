const ModuleFederationPlugin = require("../../../../lib/container/ModuleFederationPlugin");

const webpack = require("../../../../");

function createConfig(system) {
	const systemString = "" + system;
	return {
		externalsType: "system",
		name: `system_${systemString}`,
		module: {
			rules: [
				{
					test: /\.js$/,
					parser: {
						system
					}
				}
			]
		},
		plugins: [
			new webpack.DefinePlugin({
				__SYSTEM__: systemString
			}),
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

module.exports = [
	createConfig(undefined),
	createConfig(true),
	createConfig(false)
];
