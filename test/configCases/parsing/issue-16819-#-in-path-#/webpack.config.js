"use strict";

const path = require("path");

// Reproduces https://github.com/webpack/webpack/issues/16819: webpack-dev-server
// adds entries as absolute paths with query strings, and when the project lives
// in a directory containing `#` (e.g. `/home/user/proj#1/`), webpack incorrectly
// split the path at the first `#`, failing to resolve.
module.exports = {
	entry: `${path.join(__dirname, "index.js")}?protocol=ws&port=8080`
};
