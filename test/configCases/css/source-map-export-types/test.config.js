"use strict";

const fs = require("fs");
const { SourceMap } = require("node:module");
const path = require("path");

module.exports = {
	moduleScope(scope) {
		scope.__nodeFs = fs;
		scope.__nodePath = path;
		scope.__NodeSourceMap = SourceMap;
		scope.__NodeBuffer = Buffer;
	}
};
