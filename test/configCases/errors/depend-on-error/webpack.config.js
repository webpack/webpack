/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		foo: "./file-does-not-exist.js",
		bar: {
			import: ["./index.js"],
			dependOn: ["foo"]
		}
	},
	output: {
		filename: "[name].js"
	}
};
