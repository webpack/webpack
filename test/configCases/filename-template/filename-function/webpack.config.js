/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: {
		a: "./a",
		b: {
			import: "./b",
			filename: data =>
				`${data.chunk.name + data.chunk.name + data.chunk.name}.js`
		}
	},
	output: {
		filename: data => `${data.chunk.name + data.chunk.name}.js`,
		chunkFilename: data => `${data.chunk.name + data.chunk.name}.js`
	}
};
