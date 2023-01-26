const baseConfig = {
	mode: "production",
	entry: "./index.js",
	output: {
		filename: "[name]-[contenthash].js"
	},
	stats: {
		chunks: true
	}
};

/** @type {import("../../../types").Configuration} */
module.exports = [
	{
		...baseConfig,
		name: "With worker public path",
		...{
			output: {
				filename: "[name]-[contenthash].js",
				workerPublicPath: "/workerPublicPath2/"
			}
		}
	},
	{
		...baseConfig,
		name: "No worker public path"
	}
];
