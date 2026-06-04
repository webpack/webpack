"use strict";

const path = require("path");
const { pathToFileURL } = require("url");

/** @type {import("../../../../").LoaderDefinitionFunction} */
module.exports = function (source) {
	const callback = this.async();
	const contextUrl = pathToFileURL(this.context);
	// utils.absolutify and utils.contextify accept a file URL context
	const absolute = this.utils.absolutify(contextUrl, "./dep.js");
	expect(absolute).toBe(path.join(this.context, "dep.js"));
	expect(this.utils.contextify(contextUrl, absolute)).toBe("./dep.js");
	// addContextDependency / addMissingDependency / addBuildDependency accept file URL instances
	this.addContextDependency(contextUrl);
	this.addMissingDependency(
		pathToFileURL(path.join(this.context, "missing.js"))
	);
	this.addBuildDependency(pathToFileURL(__filename));
	// getResolve() with a file URL context instead of a path string
	const resolve = this.getResolve();
	resolve(contextUrl, "./dep", (err, viaGetResolve) => {
		if (err) return callback(err);
		// resolve() with a file URL context instead of a path string
		this.resolve(contextUrl, "./dep", (err2, result) => {
			if (err2) return callback(err2);
			expect(result).toBe(viaGetResolve);
			// addDependency() given a file URL instance
			this.addDependency(pathToFileURL(/** @type {string} */ (result)));
			callback(null, source);
		});
	});
};
