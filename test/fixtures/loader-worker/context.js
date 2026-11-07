"use strict";

/** @type {import("../../../").LoaderDefinition} */
module.exports = function () {
	const callback = this.async();
	const options = this.getOptions();
	const hash = this.utils.createHash("md4");
	hash.update("x");
	const digest = hash.digest("hex");
	const defaultHash = this.utils.createHash();
	defaultHash.update("y");
	const contextified = this.utils.contextify(this.context, this.resourcePath);
	const absolutified = this.utils.absolutify(this.context, "./value.js");
	const compilation = /** @type {import("../../../").Compilation} */ (
		this._compilation
	);
	const path = compilation.getPath("[name]", {
		chunk: { name: "chunk", id: "chunk", hash: "hash" }
	});
	const emptyPath = compilation.getPath("[name]");
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
							String(imported),
							emptyPath.length,
							defaultHash.digest("hex").length,
							Object.keys(options).length
						].join(":")
					);
				},
				(/** @type {Error} */ error) => callback(error)
			);
		},
		(/** @type {Error} */ error) => callback(error)
	);
};
