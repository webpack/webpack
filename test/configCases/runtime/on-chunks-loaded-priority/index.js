// Never taken: the `import()` only pulls in the jsonp runtime, whose handler the
// deferred queue consults — with none, every chunk counts as loaded.
if (global.__neverLoaded) import("./lazy");

it("should run an even-priority deferred handler without waiting for a blocked lower-priority one", () => {
	expect(global.__onChunksLoadedOrder).toEqual(["even"]);
});
