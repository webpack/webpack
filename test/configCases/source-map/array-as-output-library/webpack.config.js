module.exports = {
	devtool: "source-map",
	output: {
		filename: "MyLibrary.[name].js",
		library: ["Foo", "[name]"]
	}
};
