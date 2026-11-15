"use strict";

/** @type {import("../../../").LoaderDefinition} */
module.exports = function () {
	const callback = this.async();
	this.importModule("./missing.js").then(
		() => callback(new Error("expected an importModule error")),
		() => {
			this.resolve(this.context, "./missing.js", (resolveError) => {
				if (!resolveError) {
					callback(new Error("expected a resolve error"));
					return;
				}
				this.importModule("./missing.js", {}, (importError) => {
					if (!importError) {
						callback(new Error("expected a callback importModule error"));
						return;
					}
					this.importModule("./value.js").then(
						(imported) => {
							this.loadModule("./missing.js", (loadError) => {
								if (!loadError) {
									callback(new Error("expected a loadModule error"));
									return;
								}
								this.getResolve()(
									this.context,
									"./missing.js",
									(callbackError) => {
										if (!callbackError) {
											callback(
												new Error("expected a callback getResolve error")
											);
											return;
										}
										this.getResolve()(this.context, "./missing.js").then(
											() => callback(new Error("expected a getResolve error")),
											(resolveError) => {
												callback(
													null,
													`${String(imported)}:${resolveError.message}`
												);
											}
										);
									}
								);
							});
						},
						(/** @type {Error} */ error) => callback(error)
					);
				});
			});
		}
	);
};
