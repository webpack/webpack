/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { pathToFileURL } = require("url");
const LoaderLoadingError = require("../errors/LoaderLoadingError");

/** @typedef {import("./LoaderRunner").LoaderObject} LoaderObject */

/**
 * Lazily-compiled dynamic `import()`. Built on first use so this file still
 * parses on Node versions without native `import()` (<13.2), then reused.
 * @type {((url: URL) => Promise<EXPECTED_ANY>) | undefined}
 */
let importModule;

/**
 * @param {LoaderObject} loader the loader to load into
 * @param {EXPECTED_ANY} module the loaded module
 * @param {(err?: Error) => void} callback callback
 * @returns {void}
 */
function handleResult(loader, module, callback) {
	if (typeof module !== "function" && typeof module !== "object") {
		return callback(
			new LoaderLoadingError(
				`Module '${loader.path}' is not a loader (export function or es6 module)`
			)
		);
	}

	loader.normal = typeof module === "function" ? module : module.default;
	loader.pitch = module.pitch;
	loader.raw = module.raw;

	if (
		typeof loader.normal !== "function" &&
		typeof loader.pitch !== "function"
	) {
		return callback(
			new LoaderLoadingError(
				`Module '${loader.path}' is not a loader (must have normal or pitch function)`
			)
		);
	}
	callback();
}

/**
 * @param {LoaderObject} loader the loader to load
 * @param {(err?: Error) => void} callback callback
 * @returns {void}
 */
function loadLoader(loader, callback) {
	if (loader.type === "module") {
		try {
			if (importModule === undefined) {
				// `eval` defers parsing `import()` to runtime, so this file stays
				// loadable on Node versions that can't parse it (<13.2).
				// eslint-disable-next-line no-eval
				const dynamicImport = eval("(url) => import(url)");
				importModule = /** @type {(url: URL) => Promise<EXPECTED_ANY>} */ (
					dynamicImport
				);
			}

			importModule(pathToFileURL(loader.path)).then(
				(/** @type {EXPECTED_ANY} */ module) => {
					handleResult(loader, module, callback);
				},
				callback
			);
		} catch (err) {
			callback(/** @type {Error} */ (err));
		}
		return;
	}

	let loadedModule;
	try {
		loadedModule = require(loader.path);
	} catch (err) {
		// node can choke on require when the FD limit is hit; defer to recover.
		if (
			err instanceof Error &&
			/** @type {NodeJS.ErrnoException} */ (err).code === "EMFILE"
		) {
			setImmediate(loadLoader, loader, callback);
			return;
		}
		return callback(/** @type {Error} */ (err));
	}

	return handleResult(loader, loadedModule, callback);
}

module.exports = loadLoader;
