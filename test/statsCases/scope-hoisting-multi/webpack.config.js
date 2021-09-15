/** @type {import("../../../").Configuration[]} */
module.exports = [
	{
		mode: "production",
		entry: {
			first: "./first",
			second: "./second"
		},
		target: "web",
		output: {
			filename: "a-[name].js"
		},
		optimization: {
			concatenateModules: false,
			splitChunks: {
				cacheGroups: {
					vendor: {
						test: /vendor/,
						chunks: "initial",
						name: "vendor",
						enforce: true
					}
				}
			}
		},
		stats: {
			assets: false
		}
	},

	{
		mode: "production",
		entry: {
			first: "./first",
			second: "./second"
		},
		target: "web",
		output: {
			filename: "b-[name].js"
		},
		optimization: {
			splitChunks: {
				cacheGroups: {
					vendor: {
						test: /vendor/,
						chunks: "initial",
						name: "vendor",
						enforce: true
					}
				}
			}
		},
		stats: {
			assets: false,
			orphanModules: true,
			optimizationBailout: true
		}
	}
];
