it("should correctly import from .mjs module when using fallback (no share scope)", async () => {
	const module = await import("test-esm-pkg");
	expect(module.default).toBeTypeOf("function");
	expect(module.default("hello")).toBe("ESM module says: hello");
	expect(module.namedExport).toBe("I am a named export");
});

it("should correctly import from .mjs module when provided via share scope", async () => {
	const testEsmPkg = await import("test-esm-pkg");

	__webpack_share_scopes__["default"] = {
		"test-esm-pkg": {
			"1.0.0": {
				get: () => Promise.resolve(testEsmPkg),
				loaded: true
			}
		}
	};

	const module = await import("test-esm-pkg");

	expect(module.default).toBeTypeOf("function");
	expect(module.default("world")).toBe("ESM module says: world");
	expect(module.namedExport).toBe("I am a named export");
});
