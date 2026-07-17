import "./a.js";

it("should throw when a deferred namespace reaches a module that is still evaluating-async", () => {
	expect(globalThis.deferAsyncError).toBeInstanceOf(TypeError);
});
