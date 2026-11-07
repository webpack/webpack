"use strict";

/** @type {import("../../../../").LoaderDefinition<{ value: number, pattern: RegExp }>} */
module.exports = function (source) {
	// The worker context carries a compiler snapshot; the main thread has the full one.
	const ranInWorker = !this._compiler || this._compiler.hooks === undefined;

	if (!ranInWorker) {
		throw new Error("loader ran on the main thread");
	}

	const options = this.getOptions();
	const { customValue } = /** @type {{ customValue?: number }} */ (
		/** @type {unknown} */ (this)
	);
	const callback = this.async();

	if (customValue !== 42) {
		callback(
			new Error("compiler.options.loader did not reach the worker loader")
		);
		return;
	}
	const context = this.context || this.rootContext;
	const contextified = this.utils.contextify(context, this.resourcePath);
	const absolutified = this.utils.absolutify(context, "./value.js");
	const path = /** @type {EXPECTED_ANY} */ (
		this._compilation
	).getPath("[name]_[contenthash]", {
		filename: "style.module.css",
		contentHash: "abc",
		chunk: {
			name: "style",
			id: "style",
			hash: "chunk",
			contentHash: { css: "abc" }
		}
	});
	const contentPath = /** @type {EXPECTED_ANY} */ (
		this._compilation
	).getPath("[contenthash]", {
		contentHashType: "css",
		chunk: { contentHash: { css: "abc" } }
	});
	const digestPath = /** @type {EXPECTED_ANY} */ (this._compilation).getPath(
		"[hash:base64]",
		{ hash: "0123456789abcdef0123456789abcdef" }
	);
	const digestLengthPath = /** @type {EXPECTED_ANY} */ (
		this._compilation
	).getPath("[hash:base64:8]", { hash: "0123456789abcdef0123456789abcdef" });
	const fullHashPath = /** @type {EXPECTED_ANY} */ (this._compilation).getPath(
		"[fullhash:base64]",
		{
			hash: "0123456789abcdef0123456789abcdef",
			fullHash: "0123456789abcdef0123456789abcdef"
		}
	);
	const moduleIdPath = /** @type {EXPECTED_ANY} */ (this._compilation).getPath(
		"[moduleid]",
		{ module: { id: 7, hash: "module" } }
	);
	const digestFromBase64 = /** @type {EXPECTED_ANY} */ (
		this._compilation
	).getPath("[hash:hex]", {
		hash: "ASNFZ4mrze8BI0VniavN7w==",
		hashDigest: "base64"
	});

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
							).includes("loaded")}:${imported}:${typeof contextified}:${absolutified.endsWith(
								"value.js"
							)}:${path}:${contentPath}:${digestPath}:${digestLengthPath}:${fullHashPath}:${moduleIdPath}:${digestFromBase64}:${customValue}`
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
