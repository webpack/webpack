/** @typedef {import("../../../../").Chunk & { name: string }} Chunk */
/** @typedef {import("../../../../").PathData & { chunk: Chunk }} PathData */

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: {
		a: "./a",
		b: {
			import: "./b",
			/**
			 * @param {PathData} data data
			 * @returns {string} filename
			 */
			filename: data =>
				`${data.chunk.name + data.chunk.name + data.chunk.name}.js`
		}
	},
	output: {
		/**
		 * @param {PathData} data data
		 * @returns {string} filename
		 */
		filename: data => `${data.chunk.name + data.chunk.name}.js`,
		/**
		 * @param {PathData} data data
		 * @returns {string} filename
		 */
		chunkFilename: data => `${data.chunk.name + data.chunk.name}.js`
	}
};
