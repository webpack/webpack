import { result } from "./mid.js";

it("should key a wrapped module's escaping namespace by the original names", () => {
	// the exports are mangled, so reading the wrapper's exports object directly
	// would expose the mangled keys instead
	expect(Object.keys(result).sort()).toEqual(["alpha", "beta"]);
	expect(result.alpha).toBe("A");
	expect(result.beta).toBe("B");
});

it("should make it a real namespace object", () => {
	expect(result[Symbol.toStringTag]).toBe("Module");
	expect(result.__esModule).toBe(true);
});

it("should still evaluate the wrapped module eagerly for its side effects", () => {
	// the decoupled object is lazy, but the `import` edge is not
	expect(global.__sideEffect).toBe(true);
	delete global.__sideEffect;
});
