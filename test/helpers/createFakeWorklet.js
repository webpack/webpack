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

		const addModule = async (/** @type {string | URL} */ resource) => {
			const url = String(resource);
			const code = url.startsWith("blob:")
				? await /** @type {import("buffer").Blob} */ (
						resolveObjectURL(url)
					).text()
				: fs.readFileSync(urlToPath(url), "utf8");
			vm.runInContext(code, context, { filename: url });
		};

		return { addModule, registrations };
	};

	return { createWorklet };
};
