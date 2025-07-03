/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		entry: ["./index1.js", "./index2.js"],
		output: {
			module: true
		},
		optimization: {
			concatenateModules: true
		},
		experiments: {
			outputModule: true
		},
		target: "es2020"
	},
	{
		name: "test-output",
		entry: "./test.js",
		output: {
			filename: "test.js"
		}
	}
];
