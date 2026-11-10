"use strict";

const fs = require("fs");
const path = require("path");
const { fileURLToPath } = require("url");

const NAMES = ["auto", "hashed", "override", "hmr"];

module.exports = {
	moduleScope(scope) {
		scope.fs = fs;
		scope.path = path;
		scope.fileURLToPath = fileURLToPath;
	},
	findBundle(i) {
		return [`./${NAMES[i]}.mjs`];
	}
};
