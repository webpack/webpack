/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		a: "./entry-a",
		b: "./entry-b"
	},
	optimization: {
		sideEffects: true,
		providedExports: true,
		usedExports: true,
		concatenateModules: false,
		moduleIds: "named"
	},
	output: {
		filename: "[name].js"
	}
};
