"use strict";

const fs = require("fs");
const path = require("path");

const NAMES = ["no-loading", "loading", "node"];

module.exports = {
	moduleScope(scope) {
		scope.fs = fs;
		scope.path = path;
	},
	findBundle(i) {
		return [`./${NAMES[i]}/main.mjs`];
	}
};
