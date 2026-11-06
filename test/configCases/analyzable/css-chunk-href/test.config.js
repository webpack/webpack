"use strict";

const fs = require("fs");
const path = require("path");

const NAMES = ["auto", "hashed", "override", "hmr"];

module.exports = {
	moduleScope(scope) {
		scope.fs = fs;
		scope.path = path;
	},
	findBundle(i) {
		return [`./${NAMES[i]}.mjs`];
	}
};
