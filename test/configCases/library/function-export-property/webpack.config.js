const webpack = require("../../../../");
module.exports = {
	output: {
		libraryTarget: "var",
		libraryExport: ({ chunk }) => chunk.name
	}
}
