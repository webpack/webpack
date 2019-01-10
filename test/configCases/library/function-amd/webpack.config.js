module.exports = {
	output: {
		libraryTarget: "amd",
		library: ({ chunk }) => chunk.name
	}
}
