module.exports = [
	{
		entry: "./example.js",
		output: {
			pathinfo: true,
			filename: "output.js"
		},
		optimization: {
			moduleIds: "size",
			usedExports: true,
			mangleExports: true
		}
	},
	{
		entry: "./example.js",
		output: {
			pathinfo: true,
			filename: "without.js"
		},
		optimization: {
			moduleIds: "size",
			usedExports: false,
			mangleExports: false
		}
	}
];
