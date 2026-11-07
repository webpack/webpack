"use strict";

/** @type {import("../../../").LoaderDefinition} */
module.exports = function () {
	const callback = this.async();
	const hash = this.utils.createHash("md4");
	hash.update("x");
	const digest = hash.digest("hex");
	const contextified = this.utils.contextify(this.context, this.resourcePath);
	const absolutified = this.utils.absolutify(this.context, "./value.js");
	const path = /** @type {EXPECTED_ANY} */ (this._compilation).getPath(
		"[name]",
		{
			chunk: { name: "chunk" }
		}
	);
	this.addBuildDependency(__filename);
	let emitFileError;
	try {
		this.emitFile("extra.txt", "content");
	} catch (error) {
		emitFileError = /** @type {{ message: string }} */ (error).message;
	}
	this.getResolve()(this.context, "./value.js").then(
		(resolved) => {
			this.importModule("./value.js").then(
				(imported) => {
					callback(
						null,
						[
							digest.length,
							typeof contextified,
							absolutified.endsWith("value.js"),
							path,
							emitFileError.includes("not supported"),
							String(resolved).endsWith("value.js"),
							String(imported)
						].join(":")
					);
				},
				(/** @type {Error} */ error) => callback(error)
			);
		},
		(/** @type {Error} */ error) => callback(error)
	);
};
