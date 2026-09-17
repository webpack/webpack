"use strict";

const path = require("path");

/**
 * Reproduces #16819: webpack-dev-server adds entries as absolute paths with
 * query strings, and when the project lives in a directory containing `#`,
 * webpack splits the path at the first `#` and fails to resolve.
 * @type {import("../../../../").Configuration}
 */
module.exports = {
	entry: `${path.join(__dirname, "index.js")}?protocol=ws&port=8080`
};
