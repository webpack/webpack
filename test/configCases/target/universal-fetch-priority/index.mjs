__webpack_public_path__ = "https://example.com/public/path/";

it("should handle low fetchPriority for direct dynamic import in universal target", async() => {
	const hasBrowser = typeof document !== "undefined";
	const before = hasBrowser ? document.head._children.length : 0;
	const originalEnsure = __webpack_require__.e;
	/** @type {undefined | false | "auto" | "low" | "high"} */
	let capturedFetchPriority;

	__webpack_require__.e = (chunkId, fetchPriority) => {
		capturedFetchPriority = fetchPriority;
		return originalEnsure(chunkId, fetchPriority);
	};

	return import(
		/* webpackChunkName: "chunk1", webpackFetchPriority: "low" */ "./chunk1.mjs"
	).then(() => {
		__webpack_require__.e = originalEnsure;
		expect(capturedFetchPriority).toBe("low");

		if (hasBrowser) {
			const after = document.head._children.length;
			expect(after).toBeGreaterThanOrEqual(before);

			const insertedNodes = document.head._children.slice(before, after);
			const node = insertedNodes.find(item => {
				const srcOrHref = item.src || item.href;
				return (
					item._attributes.fetchpriority === "low" &&
					typeof srcOrHref === "string" &&
					/chunk1\.mjs$/.test(srcOrHref)
				);
			});

			if (after > before) {
				expect(node).toBeDefined();
			}
		}
	}).catch(err => {
		__webpack_require__.e = originalEnsure;
		throw err;
		});
});

it("should handle high fetchPriority for direct dynamic import in universal target", async() => {
	const hasBrowser = typeof document !== "undefined";
	const before = hasBrowser ? document.head._children.length : 0;
	const originalEnsure = __webpack_require__.e;
	/** @type {undefined | false | "auto" | "low" | "high"} */
	let capturedFetchPriority;

	__webpack_require__.e = (chunkId, fetchPriority) => {
		capturedFetchPriority = fetchPriority;
		return originalEnsure(chunkId, fetchPriority);
	};

	return import(
		/* webpackChunkName: "chunk2", webpackFetchPriority: "high" */ "./chunk2.mjs"
	).then(() => {
		__webpack_require__.e = originalEnsure;
		expect(capturedFetchPriority).toBe("high");

		if (hasBrowser) {
			const after = document.head._children.length;
			expect(after).toBeGreaterThanOrEqual(before);

			const insertedNodes = document.head._children.slice(before, after);
			const node = insertedNodes.find(item => {
				const srcOrHref = item.src || item.href;
				return (
					item._attributes.fetchpriority === "high" &&
					typeof srcOrHref === "string" &&
					/chunk2\.mjs$/.test(srcOrHref)
				);
			});

			if (after > before) {
				expect(node).toBeDefined();
			}
		}
	}).catch(err => {
		__webpack_require__.e = originalEnsure;
		throw err;
	});
});
