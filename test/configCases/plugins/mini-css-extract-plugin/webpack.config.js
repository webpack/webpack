var MCEP = require("mini-css-extract-plugin");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		a: "./a",
		b: "./b",
		c: "./c.css",
		x: "./x" // also imports chunk but with different exports
	},
	output: {
		filename: "[name].js"
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [MCEP.loader, "css-loader"]
			}
		]
	},
	optimization: {
		chunkIds: "named"
	},
	target: "web",
	node: {
		__dirname: false
	},
	plugins: [
		new MCEP(),
		compiler => {
			compiler.hooks.done.tap("Test", stats => {
				const chunkIds = stats
					.toJson({ all: false, chunks: true, ids: true })
					.chunks.map(c => c.id)
					.sort();
				expect(chunkIds).toEqual([
					"a",
					"b",
					"c",
					"chunk_js-_43b60",
					"chunk_js-_43b61",
					"chunk_js-_43b62",
					"d_css",
					"x"
				]);
			});
		}
	]
};
