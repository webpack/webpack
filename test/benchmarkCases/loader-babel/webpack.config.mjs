/** @type {import("../../..").Configuration} */
export default {
	entry: "./index",
	module: {
		rules: [
			{
				test: /\.jsx$/,
				loader: "babel-loader",
				options: {
					// Hermetic: no repo or user babel config leaks into the numbers,
					// and no cache turns later iterations into a different benchmark.
					babelrc: false,
					configFile: false,
					cacheDirectory: false,
					presets: [
						["@babel/preset-react", { runtime: "classic", pragma: "h" }]
					]
				}
			}
		]
	}
};
