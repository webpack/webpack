/** @type {import("../../..").Configuration} */
export default {
	entry: "./index",
	optimization: {
		splitChunks: {
			chunks: "all",
			minSize: 1000,
			maxSize: 20_000
		}
	}
};
