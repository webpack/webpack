import "./a.js";

it("defer-cycle-async-throw: should throw when a deferred namespace reaches a module that is still evaluating-async", () => {
	expect(globalThis.deferAsyncError).toBeInstanceOf(TypeError);
});
