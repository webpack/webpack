"use strict";

const fs = require("fs");
const path = require("path");

const NAMES = ["plain", "evaldev", "evalmap", "evalarray"];

module.exports = {
	moduleScope(scope) {
		scope.fs = fs;
		scope.path = path;
	},
	findBundle(i) {
		return [`./${NAMES[i]}.mjs`];
	}
};
