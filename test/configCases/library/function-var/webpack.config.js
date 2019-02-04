module.exports = {
	output: {
		libraryTarget: "var",
		library: ({ chunk }) => "testLibrary" + chunk.name
	}
};
