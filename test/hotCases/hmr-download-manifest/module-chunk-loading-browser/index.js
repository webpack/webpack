import update from "../../update.esm.js";

import.meta.webpackHot.accept();

for (const status of [200, 403, 500]) {
	it(`should preserve the import error when the manifest responds with ${status}`, async () => {
		const error = new TypeError("Failed to fetch dynamically imported module");
		manifestState.error = error;
		manifestState.status = status;
		await expect(__webpack_require__.hmrM()).rejects.toBe(error);
		expect(manifestState.requests.pop()).toEqual({
			url: new URL(__webpack_require__.hmrF(), manifestState.baseURL).href,
			method: "HEAD"
		});
	});
}

it("should preserve the import error when the status request fails", async () => {
	const error = new TypeError("Failed to fetch dynamically imported module");
	manifestState.error = error;
	manifestState.fetchError = new TypeError("Failed to fetch");
	await expect(__webpack_require__.hmrM()).rejects.toBe(error);
	expect(manifestState.requests).toHaveLength(1);
	manifestState.requests.length = 0;
	manifestState.fetchError = undefined;
});

it("should not probe syntax errors", async () => {
	const error = new SyntaxError("Unexpected token");
	manifestState.error = error;
	await expect(__webpack_require__.hmrM()).rejects.toBe(error);
	expect(manifestState.requests).toHaveLength(0);
});

it("should preserve the import error when fetch is unavailable", async () => {
	const error = new TypeError("Failed to fetch dynamically imported module");
	manifestState.error = error;
	const savedFetch = fetch;
	fetch = undefined;
	try {
		await expect(__webpack_require__.hmrM()).rejects.toBe(error);
		expect(manifestState.requests).toHaveLength(0);
	} finally {
		fetch = savedFetch;
	}
});

it("should keep checking after a missing manifest and apply a later update", done => {
	manifestState.error = new TypeError("Failed to fetch dynamically imported module");
	manifestState.status = 404;
	import.meta.webpackHot.check()
		.then(updatedModules => {
			expect(updatedModules).toBe(null);
			expect(import.meta.webpackHot.status()).toBe("idle");
			return import.meta.webpackHot.check();
		})
		.then(updatedModules => {
			expect(updatedModules).toBe(null);
			expect(import.meta.webpackHot.status()).toBe("idle");
			expect(manifestState.requests).toHaveLength(2);
			manifestState.requests.length = 0;
			manifestState.error = undefined;
			NEXT(update(done, true, () => done()));
		})
		.catch(done);
});
---
it("should load an available update without a status request", () => {
	expect(manifestState.requests).toHaveLength(0);
	expect(import.meta.webpackHot.status()).toBe("idle");
});
