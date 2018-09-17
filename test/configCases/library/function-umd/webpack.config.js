module.exports = [
	{
		output: {
			libraryTarget: "umd",
			library: () => ({
				root: ["test", "library"],
				amd: "test-library",
				commonjs: "test-library"
			})
		}
	},
	{
		output: {
			libraryTarget: "umd",
			library: ({ chunk }) => chunk.name
		}
	}
];
