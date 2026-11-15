"use strict";

const path = require("path");

/** @type {import("../../../").LoaderDefinition} */
module.exports = function () {
	const callback = this.async();
	this.resolve(this.context, "./value.js", (resolveError, resolved) => {
		if (resolveError) return callback(resolveError);
		this.getResolve()(this.context, "./value.js", (againError, again) => {
			if (againError) return callback(againError);
			this.loadModule("./value.js", (loadError, loaded) => {
				if (loadError) return callback(loadError);
				this.importModule("./value.js", {}, (importError, imported) => {
					if (importError) return callback(importError);
					const exec = /** @type {(code: string, filename: string) => unknown} */ (
						/** @type {unknown} */ (this).exec
					);
					let executed;
					try {
						executed = exec(
							"module.exports = 40 + 2",
							path.join(__dirname, "exec.js")
						);
					} catch (execError) {
						return callback(/** @type {Error} */ (execError));
					}
					callback(
						null,
						`${String(resolved).endsWith("value.js")}:${String(
							again
						).endsWith("value.js")}:${String(loaded)}:${String(
							imported
						)}:${String(executed)}`
					);
				});
			});
		});
	});
};
