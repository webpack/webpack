/** @type {import("../../..").Configuration} */
export default {
	entry: "./index",
	optimization: {
		splitChunks: {
			chunks: "all",
			minSize: 1000
		}
	}
};
