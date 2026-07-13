"use strict";

const { resolveObjectURL } = require("buffer");
const fs = require("fs");
const path = require("path");
const { fileURLToPath } = require("url");
const vm = require("vm");

// Simulates a worklet: `addModule(url)` evaluates the referenced chunk inside a
// single persistent global scope (as a real worklet global scope would), so the
// webpack bootstrap blob, the split chunks and the entry chunk all share state.
// `registerProcessor`/`registerPaint` registrations are captured for assertions.
// A worklet always loads its chunks as ES modules, so each is evaluated via
// `vm.SourceTextModule` (with `import.meta.url` populated) and its native
// `import`s are linked to sibling chunk files.
module.exports = (
	/** @type {{ outputDirectory: string }} */ { outputDirectory }
) => {
	const urlToPath = (/** @type {string} */ url) => {
		if (/^https:\/\/test\.cases\/path\//.test(url)) {
			url = url.slice("https://test.cases/path/".length);
		} else if (/^file:/i.test(url)) {
			return fileURLToPath(url);
		}
		return path.resolve(outputDirectory, `./${url}`);
	};

	const createWorklet = () => {
		/** @type {Map<string, EXPECTED_ANY>} */
		const registrations = new Map();
		const sandbox = {
			URL,
			TextEncoder,
			TextDecoder,
			console,
			registerProcessor: (
				/** @type {string} */ name,
				/** @type {EXPECTED_ANY} */ ctor
			) => {
				registrations.set(name, ctor);
			},
			registerPaint: (
				/** @type {string} */ name,
				/** @type {EXPECTED_ANY} */ ctor
			) => {
				registrations.set(name, ctor);
			}
		};
		const context = vm.createContext(sandbox);

		const readCode = async (/** @type {string} */ url) =>
			url.startsWith("blob:")
				? await /** @type {import("buffer").Blob} */ (
						resolveObjectURL(url)
					).text()
				: fs.readFileSync(urlToPath(url), "utf8");

		/** @type {Map<string, vm.SourceTextModule>} */
		const compiled = new Map();
		const compile = (/** @type {string} */ u, /** @type {string} */ src) => {
			const record = new vm.SourceTextModule(src, {
				context,
				identifier: u,
				initializeImportMeta: (meta) => {
					meta.url = u;
				}
			});
			compiled.set(u, record);
			return record;
		};
		const link = async (
			/** @type {string} */ specifier,
			/** @type {vm.Module} */ referencing
		) => {
			const childUrl = new URL(specifier, referencing.identifier).href;
			return (
				compiled.get(childUrl) || compile(childUrl, await readCode(childUrl))
			);
		};

		const addModule = async (/** @type {string | URL} */ resource) => {
			const url = String(resource);
			const entry = compile(url, await readCode(url));
			await entry.link(link);
			await entry.evaluate();
		};

		return { addModule, registrations };
	};

	return { createWorklet };
};
