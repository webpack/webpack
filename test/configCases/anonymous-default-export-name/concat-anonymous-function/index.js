import inner from "./inner";

it("should handle anonymous default function declaration under module concatenation", () => {
	// When ConcatenationScope renames `__WEBPACK_DEFAULT_EXPORT__` to a
	// module-scoped symbol, any Reflect.defineProperty InitFragment added
	// for the anonymous default fix-up must reference the renamed symbol.
	expect(inner()).toBe(42);
	expect(inner.name).toBe("default");
});
