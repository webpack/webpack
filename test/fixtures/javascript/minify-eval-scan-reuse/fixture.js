"use strict";

const fs = require("fs");
const path = require("path");

module.exports.inputs = ["eval", "String", "\\u0065val", "eval"].map((name) => ({
	source: fs
		.readFileSync(path.join(__dirname, "index.js"), "utf8")
		.replace("eval", name),
	hasEval: name !== "String"
}));
