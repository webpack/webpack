/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		target: ["web", "es2020"],
		entry: {
			"cjs-and-esm": "./cjs-and-esm",
			amd: "./amd"
		},
		externalsType: {
			"static-import": "commonjs",
			"dynamic-import": "import",
			amd: "commonjs",
			fallback: "window"
		},
		externals: {
			external1: "external111",
			external2: "external222",
			external3: "external333",
			external4: "external444"
		},
		output: {
			filename: "[name].js"
		}
	},
	{
		target: ["node"],
		output: {
			filename: "[name].js"
		}
	}
];
