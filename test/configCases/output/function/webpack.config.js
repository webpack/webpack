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
			data.chunk.name === "a" ? `${data.chunk.name}.js` : "[name].js"
	}
};
