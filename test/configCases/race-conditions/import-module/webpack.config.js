/** @type {import("../../../../").Configuration} */
module.exports = {
	parallelism: 1,
	mode: "development",
	module: {
		rules: [
			{
				test: /\.css$/i,
				use: [require.resolve("./loader"), "css-loader"]
			}
		]
	}
};
