/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		filename: "[name].mjs",
		module: true
	},
	target: ["es2022", "async-node"],
	entry: {
		one: "./one",
		"dir2/two": "./two",
		"/three": "./three",
		"/dir4/four": "./four",
		"/dir5/dir6/five": "./five",
		"/dir5/dir6/six": "./six"
	},
	optimization: {
		runtimeChunk: "single"
	},
	experiments: {
		outputModule: true
	}
};
