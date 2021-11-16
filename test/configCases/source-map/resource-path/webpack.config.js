const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	experiments: {
		layers: true
	},
	devtool: "source-map",
	entry: {
		main: {
			import: "./index",
			layer: "something"
		}
	},
	output: {
		devtoolModuleFilenameTemplate(info) {
			const rootDir = process.cwd();
			const rel = path.relative(rootDir, info.absoluteResourcePath);
			return `webpack:///${rel}`;
		}
	}
};
