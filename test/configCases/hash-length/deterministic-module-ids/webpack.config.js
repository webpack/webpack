var webpack = require("../../../../");
/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		optimization: {
			moduleIds: "deterministic"
		}
	},
	{
		optimization: {
			moduleIds: false
		},
		plugins: [
			new webpack.ids.DeterministicModuleIdsPlugin({
				maxLength: 0
			})
		]
	},
	{
		optimization: {
			moduleIds: false
		},
		plugins: [
			new webpack.ids.DeterministicModuleIdsPlugin({
				maxLength: 100
			})
		]
	}
];
