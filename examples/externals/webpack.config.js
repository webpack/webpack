module.exports = {
	// mode: "development || "production",
	output: {
		libraryTarget: "umd"
	},
	externals: [
		"add",
		{
			subtract: {
				root: "subtract",
				commonjs2: "./subtract",
				commonjs: ["./math", "subtract"],
				amd: "subtract"
			}
		}
	]
};
