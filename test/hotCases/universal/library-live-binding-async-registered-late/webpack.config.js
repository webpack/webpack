"use strict";

const path = require("path");
const config = require("../../esm-output/library-live-binding-async-registered-late/webpack.config");

/** @type {import("../../../../").Configuration} */
module.exports = {
	...config,
	context: path.resolve(
		__dirname,
		"../../esm-output/library-live-binding-async-registered-late"
	)
};
