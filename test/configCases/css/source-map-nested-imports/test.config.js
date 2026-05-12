"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	moduleScope(scope) {
		scope.__nodeFs = fs;
		scope.__nodePath = path;
		scope.__NodeBuffer = Buffer;
	}
};
