import "./dep.js";

it("should throw when a deferred namespace of an async module is forced while it evaluates", () => {
	expect(globalThis.deferAsyncSelfError).toBeInstanceOf(TypeError);
});
