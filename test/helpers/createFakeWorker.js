"use strict";

const path = require("path");

module.exports = (
	/** @type {{ outputDirectory: string }} */ { outputDirectory }
) =>
	class Worker {
		/**
		 * @param {string | URL} resource worker resource
		 * @param {{ type?: string, originalURL?: URL }} options worker options
		 */
		constructor(resource, options = {}) {
			const isFileURL = /^file:/i.test(/** @type {string} */ (resource));
			const isBlobURL = /^blob:/i.test(/** @type {string} */ (resource));

			if (!isFileURL && !isBlobURL) {
				expect(/** @type {URL} */ (resource).origin).toBe("https://test.cases");
				expect(
					/** @type {URL} */ (resource).pathname.startsWith("/path/")
				).toBe(true);
			}

			this.url = resource;
			const file = isFileURL
				? resource
				: path.resolve(
						outputDirectory,
						isBlobURL
							? /** @type {URL} */ (options.originalURL).pathname.slice(6)
							: /** @type {URL} */ (resource).pathname.slice(6)
					);

			const workerBootstrap = `
const { parentPort } = require("worker_threads");
const { URL, fileURLToPath } = require("url");
const path = require("path");
const fs = require("fs");
const { createRequire } = require("module");
// Root require at a real file: Bun's eval-worker module context is a blob: URL,
// from which require() of the emitted chunks (incl. hot-update) fails to resolve.
const scopedRequire = createRequire(path.join(${JSON.stringify(
				outputDirectory
			)}, "__importScripts.js"));
global.self = global;
// Expose parentPort as a global for workers that use it directly (e.g. the
// blob-URL worker); Bun does not surface it implicitly the way Node does here.
self.parentPort = parentPort;
self.URL = URL;
// Deno's worker globalThis.location is a read-only "data:text/javascript," (the
// eval-worker URL), so a plain assignment is silently ignored and webpack then
// derives a bogus "data:text/" publicPath; defineProperty overrides it (Node/Bun
// allow either). Engines also format object URLs differently (Node
// "blob:nodedata:<id>", Bun "blob:<id>"), so build a blob: location from the
// original URL — the runtime's publicPath derivation (strip "blob:" + last path
// segment) works regardless.
Object.defineProperty(self, "location", {
	configurable: true,
	writable: true,
	value: new URL(${JSON.stringify(
		isBlobURL
			? `blob:${/** @type {URL} */ (options.originalURL)}`
			: resource.toString()
	)})
});
const urlToPath = url => {
  if (/^file:/i.test(url)) return fileURLToPath(url);
	if (url.startsWith("https://test.cases/path/")) url = url.slice(24);
	return path.resolve(${JSON.stringify(outputDirectory)}, \`./\${url}\`);
};
self.importScripts = url => {
	${
		options.type === "module"
			? 'throw new Error("importScripts is not supported in module workers")'
			: "scopedRequire(urlToPath(url))"
	};
};
self.fetch = async url => {
	try {
		const buffer = await new Promise((resolve, reject) =>
			fs.readFile(urlToPath(url), (err, b) =>
				err ? reject(err) : resolve(b)
			)
		);
		return {
		  headers: { get(name) { } },
			status: 200,
			ok: true,
			arrayBuffer() { return buffer; },
			json: async () => JSON.parse(buffer.toString("utf-8"))
		};
	} catch(err) {
		if(err.code === "ENOENT") {
			return {
				status: 404,
				ok: false
			};
		}
		throw err;
	}
};

self.postMessage = data => {
	parentPort.postMessage(data);
};
// Deliver parentPort messages to self.onmessage, buffering until it is set
// (browsers queue messages until onmessage is assigned; the worker module may
// set it only after async startup). Defining onmessage as an accessor also stops
// Bun's web-Worker API from dispatching to it natively, which would otherwise
// deliver every message twice.
let onmessageHandler;
const messageBuffer = [];
Object.defineProperty(self, "onmessage", {
	configurable: true,
	get() { return onmessageHandler; },
	set(fn) {
		onmessageHandler = fn;
		if (fn) for (const data of messageBuffer.splice(0)) fn({ data });
	}
});
parentPort.on("message", data => {
	if (onmessageHandler) onmessageHandler({ data });
	else messageBuffer.push(data);
});
if (${options.type === "module"}) {
	import(${JSON.stringify(file)});
} else {
	scopedRequire(${JSON.stringify(file)});
}
`;
			this.worker = new (require("worker_threads").Worker)(workerBootstrap, {
				eval: true
			});

			this._terminated = false;
			// A chunk load rejected after the test got its result and called
			// terminate() surfaces as an uncaught worker error (notably under Deno,
			// where pending dynamic imports reject during teardown); swallow it once
			// terminated so it can't fail an unrelated later test. Genuine in-test
			// errors still propagate.
			this._onerror = (/** @type {Error} */ err) => {
				if (!this._terminated) throw err;
			};
			this.worker.on("error", this._onerror);

			/** @type {((data: unknown) => void) | undefined} */
			this._onmessage = undefined;
		}

		// eslint-disable-next-line accessor-pairs
		set onmessage(/** @type {(event: { data: unknown }) => void} */ value) {
			if (this._onmessage) this.worker.off("message", this._onmessage);
			this.worker.on(
				"message",
				(this._onmessage = (data) => {
					value({
						data
					});
				})
			);
		}

		postMessage(/** @type {unknown} */ data) {
			this.worker.postMessage(data);
		}

		terminate() {
			this._terminated = true;
			this.worker.off("error", this._onerror);
			if (this._onmessage) this.worker.off("message", this._onmessage);
			return this.worker.terminate();
		}
	};
