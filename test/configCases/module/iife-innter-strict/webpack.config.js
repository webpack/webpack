/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		entry: ["./index.mjs"],
		output: {
			module: false
		}
	},
	{
		name: "test-output",
		entry: "./test.js",
		output: {
			filename: "test.js"
		}
	}
];
