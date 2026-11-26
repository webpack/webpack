"use strict";

const path = require("path");
const ReadRecordsPlugin = require("./ReadRecordsPlugin");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry: "./index",
	recordsInputPath: path.resolve(__dirname, "records.json"),
	output: {
		chunkFilename: "[name]-[chunkhash].js"
	},
	plugins: [new ReadRecordsPlugin()],
	optimization: {
		splitChunks: {
			minSize: 0
		}
	}
};
