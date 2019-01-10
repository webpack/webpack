module.exports = [
	{
		output: {
			libraryTarget: "umd",
			library: ({ chunk }) => ({
				root: ["test", "library", chunk.name],
				amd: "library" + chunk.name,
				commonjs: "library" + chunk.name
			})
		}
	},
	{
		output: {
			libraryTarget: "umd",
			library: ({ chunk }) => chunk.name + '[id]'
		}
	}
];
