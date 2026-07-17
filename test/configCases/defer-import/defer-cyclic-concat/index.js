import "./a.js";

it("should throw when a deferred namespace forces evaluation of an already-evaluating module (even with scope hoisting)", () => {
	expect(globalThis.deferCyclicError).toBeInstanceOf(TypeError);
});
