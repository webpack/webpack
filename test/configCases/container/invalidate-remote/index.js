// Load the module that actually imports the federated remote.
// This dynamic import triggers ensureChunkHandlers (for the async chunk with
// the remote) and ensures the federation runtime requirement is fulfilled,
// installing __webpack_require__.federation on the runtime.
it("should expose __webpack_require__.federation object", () => {
	return import("./remote").then(() => {
		expect(typeof __webpack_require__.federation).toBe("object");
		expect(typeof __webpack_require__.federation.invalidateRemote).toBe(
			"function"
		);
	});
});

it("should expose __webpack_federation__ magic global", () => {
	return import("./remote").then(() => {
		expect(typeof __webpack_federation__).toBe("object");
		expect(__webpack_federation__).toBe(__webpack_require__.federation);
	});
});

it("should remove a module from cache when invalidateRemote is called", () => {
	return import("./remote").then(() => {
		const federation = __webpack_require__.federation;
		const moduleId = "synthetic-test-module-x";

		// Seed a fake entry in the module cache.
		__webpack_require__.c[moduleId] = {
			exports: { value: 42 },
			id: moduleId
		};
		// Seed a fake entry in the module factories.
		__webpack_require__.m[moduleId] = function () {};
		// Seed a fake data.p flag in the remote mapping.
		federation._remoteMapping[moduleId] = { p: 1 };

		// Invalidate the module.
		federation.invalidateRemote(moduleId);

		// The module cache entry must be gone.
		expect(__webpack_require__.c[moduleId]).toBeUndefined();
		// The module factory must be gone.
		expect(__webpack_require__.m[moduleId]).toBeUndefined();
		// The remote mapping data.p must be reset to undefined.
		expect(federation._remoteMapping[moduleId].p).toBeUndefined();
	});
});
