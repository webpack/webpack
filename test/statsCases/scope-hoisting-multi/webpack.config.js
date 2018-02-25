module.exports = [
	{
		mode: "production",
		entry: {
			first: "./first",
			second: "./second"
		},
		target: "web",
		output: {
			filename: "[name].js"
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
			filename: "[name].js"
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
			optimizationBailout: true
		}
	}
];
