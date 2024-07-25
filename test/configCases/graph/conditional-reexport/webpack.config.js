/** @type {import("webpack").Configuration} */
module.exports = {
	entry: {
		a: "./a.js",
		b: "./b.js"
	},
	output: {
		filename: "[name].js"
	},
	target: "web",
	mode: "production",
	module: {
		rules: [
			{
				test: /lib\/common/,
				sideEffects: false
			}
		]
	},
	optimization: {
		concatenateModules: false,
		splitChunks: {
			cacheGroups: {
				lib: {
					name: "lib",
					test: /lib/,
					chunks: "all",
					minSize: 0
				}
			}
		}
	}
};
