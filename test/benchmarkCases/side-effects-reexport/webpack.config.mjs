/** @type {import("../../../types.d.ts").Configuration} */
export default {
	devtool: false,
	target: "web",
	entry: "./index.js",
	mode: "development",
	experiments: {
		css: true
	},
	optimization: {
		concatenateModules: false
	}
};
