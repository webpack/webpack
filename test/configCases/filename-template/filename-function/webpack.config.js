/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: {
		a: "./a",
		b: {
			import: "./b",
			filename: data => {
				return data.chunk.name + data.chunk.name + data.chunk.name + ".js";
			}
		}
	},
	output: {
		filename: data => {
			return data.chunk.name + data.chunk.name + ".js";
		},
		chunkFilename: data => {
			return data.chunk.name + data.chunk.name + ".js";
		}
	}
};
