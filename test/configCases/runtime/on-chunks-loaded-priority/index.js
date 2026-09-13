// Never taken: the `import()` only pulls in the jsonp runtime, whose handler the
// deferred queue consults — with none, every chunk counts as loaded.
if (global.__neverLoaded) import("./lazy");

it("should run an even-priority deferred handler without waiting for a blocked lower-priority one", () => {
	// The odd-priority handler is loaded but must stay deferred behind the blocked
	// priority 0; keeping insertion order instead would run it and record "odd".
	expect(global.__onChunksLoadedOrder).toEqual(["even"]);
});
