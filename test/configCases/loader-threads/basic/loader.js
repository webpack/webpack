"use strict";

/** @type {import("../../../../").LoaderDefinition<{ value: number, pattern: RegExp }>} */
module.exports = function (source) {
	const { isMainThread } = require("worker_threads");

	if (isMainThread) {
		throw new Error("loader ran on the main thread");
	}

	const options = this.getOptions();
	const callback = this.async();

	if (!options.pattern.test("worker")) {
		callback(new Error("loader options did not survive the worker"));
		return;
	}

	this.cacheable();
	this.addDependency(__filename);
	this.getLogger("loader-threads").info("loader ran in a worker");
	this.emitWarning(new Error("worker loader warning"));
	this.resolve(this.context, "./dependency.js", (error, resolved) => {
		if (error) {
			callback(error);
			return;
		}
		if (typeof resolved !== "string" || !resolved.endsWith("dependency.js")) {
			callback(new Error(`unexpected resolution: ${resolved}`));
			return;
		}
		this.loadModule("./loaded.js", (loadError, loaded) => {
			if (loadError) {
				callback(loadError);
				return;
			}
			this.importModule("./loaded.js", {}, (importError, imported) => {
				if (importError) {
					callback(importError);
					return;
				}
				setTimeout(() => {
					callback(
						null,
						`module.exports = ${JSON.stringify(
							`worker:${options.value}:${raw(
								/** @type {string | Buffer} */ (loaded)
							).includes("loaded")}:${imported}`
						)};`
					);
				}, 10);
			});
		});
	});
};

/**
 * @param {string | Buffer} source source
 * @returns {string} source as a string
 */
const raw = (source) => (typeof source === "string" ? source : source.toString());
