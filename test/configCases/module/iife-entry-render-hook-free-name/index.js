require("./injected");

let value = 42;

it("keeps a render hook's global read out of the inlined entry's scope", () => {
	expect(value).toBe(42);
	// the hook's `typeof value` runs before this declaration is initialized, so
	// reading the entry's `value` would throw instead of seeing the real global
	expect(global.injectedTypeOfValue).toBe("undefined");
});
