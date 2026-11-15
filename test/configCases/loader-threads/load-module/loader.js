"use strict";

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source) {
	if (this.resourcePath.endsWith("loaded.js")) {
		return "module.exports = 'loaded';";
	}
	const callback = this.async();
	this.loadModule("./loaded.js", (error, loaded) => {
		if (error) {
			callback(error);
			return;
		}
		callback(
			null,
			`module.exports = ${JSON.stringify(
				`value:${String(loaded).includes("loaded") ? "loaded" : "missing"}`
			)};`
		);
	});
};
