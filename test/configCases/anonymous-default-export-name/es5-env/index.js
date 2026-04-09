import constant from "./constant";

it("should not throw ReferenceError when importing an anonymous default export in an ES5 environment", () => {
	// Regression test for https://github.com/webpack/webpack/issues/20793
	// With `output.environment.const = false`, the harmony default export
	// template assigns directly to `__webpack_exports__["default"]` without
	// declaring `__WEBPACK_DEFAULT_EXPORT__`. The anonymous-default `.name`
	// fix-up must not reference that undeclared binding.
	const fn = constant(42);
	expect(typeof fn).toBe("function");
	expect(fn()).toBe(42);
});
