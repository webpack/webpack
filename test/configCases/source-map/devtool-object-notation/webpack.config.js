/** @type {import("../../../../").Configuration} */
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	devtool: {
		publicPath: "https://test.cases/",
		filename: "[file].test.map",
		append: "\n//# test-sourceMappingURL=[url]",
		namespace: "webpackTest",
		columns: false,
		sourceRoot: "/src/",
		debugIds: true,
		module: true,
		noSources: true,
		include: /.js$/
	},
	module: {
		generator: {
			css: {
				exportsOnly: false
			}
		}
	},
	experiments: {
		css: true
	}
};
