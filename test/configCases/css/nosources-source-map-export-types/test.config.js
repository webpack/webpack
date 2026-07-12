"use strict";

const fs = require("node:fs");
const path = require("node:path");

module.exports = {
	moduleScope(scope) {
		scope.__nodeFs = fs;
		scope.__nodePath = path;
		scope.__NodeBuffer = Buffer;
	}
};
