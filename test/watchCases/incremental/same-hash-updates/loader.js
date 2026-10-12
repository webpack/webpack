"use strict";

const fs = require("fs");
const path = require("path");

/**
 * @this {import("../../../..").LoaderContext<Record<string, never>>}
 * @param {string} source source
 * @returns {string} unchanged source
 */
module.exports = function trackDependencies(source) {
	const reportPath = path.join(this.rootContext, "report.json");
	this.addDependency(reportPath);
	const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
	this.addDependency(path.join(this.rootContext, report.file));
	return source;
};
