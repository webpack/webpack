// Never taken. The `import()` is here so the build carries the jsonp chunk
// loading runtime, which is what registers the `__webpack_require__.O` handler
// the deferred queue consults — with no handler every chunk counts as loaded.
if (global.__neverLoaded) import("./lazy");

it("should run an even-priority deferred handler without waiting for a blocked lower-priority one", () => {
	expect(global.__onChunksLoadedOrder).toEqual(["even"]);
});
