/** @type {import("../../../").Configuration} */
const baseConfig = {
	mode: "production",
	entry: "./index",
	stats: {
		modulesSpace: Infinity,
		optimizationBailout: true,
		nestedModules: true,
		usedExports: true,
		providedExports: true
	},
	optimization: {
		minimize: true
	}
};

module.exports = [
	baseConfig,
	{
		...baseConfig,
		output: {
			filename: "[name].no-side.js"
		},
		optimization: {
			...baseConfig.optimization,
			sideEffects: false
		}
	}
];
