"use strict";

const { resolveObjectURL } = require("buffer");
const fs = require("fs");
const path = require("path");
const { fileURLToPath } = require("url");
const vm = require("vm");

// Simulates a worklet: `addModule(url)` evaluates the referenced script inside a
// single persistent global scope (as a real worklet global scope would), so the
// webpack bootstrap blob, the split chunks and the entry chunk all share state.
// `registerProcessor`/`registerPaint` registrations are captured for assertions.
// With `module: true` the chunk is an ES module (module output): it is evaluated
// via `vm.SourceTextModule` and its native `import`s are linked to sibling chunk
// files, as a real module worklet resolves its static import graph.
module.exports = (
	/** @type {{ outputDirectory: string, module?: boolean }} */ {
		outputDirectory,
		module: isModule
	}
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

		const addModule = async (/** @type {string | URL} */ resource) => {
			const url = String(resource);
			const code = await readCode(url);
			if (!isModule) {
				vm.runInContext(code, context, { filename: url });
				return;
			}
			/** @type {Map<string, vm.SourceTextModule>} */
			const compiled = new Map();
			const compile = (/** @type {string} */ u, /** @type {string} */ src) => {
				const record = new vm.SourceTextModule(src, { context, identifier: u });
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
			const entry = compile(url, code);
			await entry.link(link);
			await entry.evaluate();
		};

		return { addModule, registrations };
	};

	return { createWorklet };
};
