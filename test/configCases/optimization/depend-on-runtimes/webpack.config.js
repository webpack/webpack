/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		filename: "[name].js"
	},
	optimization: {
		chunkIds: "named"
	},
	entry: {
		a: "./a",
		b: "./b",
		c: {
			import: "./c",
			runtime: "runtime-c"
		},
		"a-or-b": {
			import: "./a-or-b",
			dependOn: ["a", "b"]
		},
		"b-or-c": {
			import: "./b-or-c",
			dependOn: ["b", "c"]
		}
	}
};
