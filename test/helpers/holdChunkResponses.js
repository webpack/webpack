"use strict";

const fs = require("fs");
const path = require("path");

/**
 * @typedef {object} HeldResponse
 * @property {string} url URL of the held request
 * @property {() => void} deliver hands the response to the runtime
 * @property {() => void} fail makes the request fail instead
 */

/**
 * @typedef {object} ChunkResponseHold
 * @property {(pattern: RegExp) => void} start holds every chunk request whose URL matches from now on
 * @property {() => number} count number of responses held so far
 * @property {() => void} release delivers the held responses in request order and stops holding
 * @property {(pattern: RegExp) => void} fail makes the held requests whose URL matches fail
 * @property {((url: string) => Promise<unknown>) | undefined} nativeImport the bundle's own `import()`, set by an ES module case
 * @property {(url: string) => Promise<unknown>} importChunk an `output.importFunctionName` that can hold a chunk
 */

/**
 * Exposes `HOLD` to a hot case: a held chunk request reads its file at once, like a server
 * answering slowly, and the runtime receives that response only on release.
 * @param {Record<string, EXPECTED_ANY>} scope module scope
 * @param {import("../../").Configuration} options webpack options
 * @returns {void}
 */
const moduleScope = (scope, options) => {
	if (scope.HOLD) return;
	/** @type {RegExp | undefined} */
	let holding;
	/** @type {HeldResponse[]} */
	const held = [];
	let copies = 0;
	/** @type {ChunkResponseHold} */
	const hold = {
		start(pattern) {
			holding = pattern;
		},
		count() {
			return held.length;
		},
		release() {
			holding = undefined;
			for (const response of held.splice(0)) response.deliver();
		},
		fail(pattern) {
			for (const response of held.filter((item) => pattern.test(item.url))) {
				held.splice(held.indexOf(response), 1);
				response.fail();
			}
		},
		nativeImport: undefined,
		importChunk(url) {
			if (!hold.nativeImport) throw new Error("HOLD.nativeImport is not set");
			const response = hold.nativeImport(url);
			if (!holding || !holding.test(url)) return response;
			return new Promise((resolve, reject) => {
				held.push({
					url,
					deliver: () => resolve(response),
					fail: () => reject(new Error(`Failed to fetch ${url}`))
				});
			});
		}
	};
	const { document } = scope;
	if (document) {
		/** @type {(src: string) => void} */
		const load = document.onScript;
		const outputPath = /** @type {string} */ (
			/** @type {NonNullable<import("../../").Configuration["output"]>} */ (
				options.output
			).path
		);
		document.onScript = (/** @type {string} */ src) => {
			if (!holding || !holding.test(src)) return load(src);
			// The next build may overwrite the file, so the response is copied now and
			// the copy is evaluated on release.
			const name = path.basename(new URL(src).pathname);
			const copy = `held-${copies++}-${name}`;
			fs.copyFileSync(path.join(outputPath, name), path.join(outputPath, copy));
			held.push({
				url: src,
				deliver: () => load(src.slice(0, -name.length) + copy),
				fail: () => {
					const script = document
						.getElementsByTagName("script")
						.find((/** @type {{ src: string }} */ node) => node.src === src);
					script.onerror({ type: "error", target: script });
				}
			});
		};
	}
	scope.HOLD = hold;
};

module.exports = { moduleScope };
