"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	moduleScope(scope) {
		scope.fs = fs;
		scope.path = path;
	}
};
