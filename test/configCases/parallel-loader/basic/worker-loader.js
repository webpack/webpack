"use strict";

const path = require("path");

/** @type {import("../../../../").LoaderDefinition<{ suffix: string }>} */
module.exports = function (source) {
	const { suffix } = this.getOptions();

	// exercises the dependency channel back to the main thread
	this.addDependency(path.resolve(this.context, "dependency.txt"));
	this.getLogger("parallel-loader").debug("ran off the main thread");

	let threw = false;
	try {
		// eslint-disable-next-line no-unused-expressions
		this._compilation;
	} catch (_err) {
		threw = true;
	}
	if (!threw) {
		throw new Error("_compilation should throw when read in a worker");
	}

	return source.replace("SUFFIX", JSON.stringify(suffix));
};
