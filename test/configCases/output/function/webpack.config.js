/** @typedef {import("../../../../").Chunk} Chunk */

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry() {
		return {
			a: "./a",
			b: "./b"
		};
	},
	output: {
		filename: data =>
			/** @type {Chunk} */
			(data.chunk).name === "a"
				? `${/** @type {Chunk} */ (data.chunk).name}.js`
				: "[name].js"
	}
};
