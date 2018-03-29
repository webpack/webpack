const path = require("path");
const stats = {
	hash: false,
	timings: false,
	builtAt: false,
	assets: false,
	chunks: true,
	chunkOrigins: true,
	entrypoints: true,
	modules: false
};
module.exports = [
	{
		name: "disabled",
		mode: "production",
		entry: {
			main: "./",
			a: "./a",
			b: "./b",
			c: "./c"
		},
		output: {
			filename: "disabled/[name].js"
		},
		optimization: {
			splitChunks: false
		},
		stats
	},
	{
		name: "default",
		mode: "production",
		entry: {
			main: "./",
			a: "./a",
			b: "./b",
			c: "./c"
		},
		output: {
			filename: "default/[name].js"
		},
		optimization: {
			splitChunks: {
				minSize: 0 // enforce all
			}
		},
		stats
	},

	{
		name: "vendors",
		mode: "production",
		entry: {
			main: "./",
			a: "./a",
			b: "./b",
			c: "./c"
		},
		output: {
			filename: "vendors/[name].js"
		},
		optimization: {
			splitChunks: {
				cacheGroups: {
					vendors: {
						test: /[\\/]node_modules[\\/]/,
						chunks: "initial",
						name: "vendors",
						enforce: true
					}
				}
			}
		},
		stats
	},

	{
		name: "multiple-vendors",
		mode: "production",
		entry: {
			main: "./",
			a: "./a",
			b: "./b",
			c: "./c"
		},
		output: {
			filename: "multiple-vendors/[name].js"
		},
		optimization: {
			splitChunks: {
				minSize: 0, // enforce all
				chunks: "all",
				cacheGroups: {
					libs: module => {
						if (!module.nameForCondition) return;
						const name = module.nameForCondition();
						const match = /[\\/](xyz|x)\.js/.exec(name);
						if (match)
							return {
								name: "libs-" + match[1],
								enforce: true
							};
					},
					vendors: path.resolve(__dirname, "node_modules")
				}
			}
		},
		stats
	},
	{
		name: "all",
		mode: "production",
		entry: {
			main: "./",
			a: "./a",
			b: "./b",
			c: "./c"
		},
		output: {
			filename: "all/[name].js"
		},
		optimization: {
			splitChunks: {
				minSize: 0, // enforce all
				chunks: "all",
				cacheGroups: {
					vendors: path.resolve(__dirname, "node_modules")
				}
			}
		},
		stats
	}
];
