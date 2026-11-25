"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return ["bundle.mjs"];
	},
	moduleScope(scope) {
		scope.fs = fs;
		scope.path = path;
	}
};
