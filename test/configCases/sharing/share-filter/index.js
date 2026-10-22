it("should resolve filtered-out versions like unshared modules", async () => {
	await __webpack_init_sharing__("default");
	const { version: shared } = await import("shared");
	const { version: other } = await import("other");
	const inner = await import("my-module");
	expect(shared).toBe("2.0.0");
	expect(other).toBe("2.0.0");
	expect(inner.shared).toBe("1.0.0");
	expect(inner.other).toBe("1.0.0");
	const scope = __webpack_share_scopes__.default;
	expect(Object.keys(scope.shared)).toEqual(["2.0.0"]);
	expect(Object.keys(scope.other)).toEqual(["2.0.0"]);
});

it("should share only the prefixed requests the request filters match", async () => {
	await __webpack_init_sharing__("default");
	const [a, b, c] = await Promise.all([
		import("lib/a"),
		import("lib/b"),
		import("lib/c")
	]);
	expect([a.default, b.default, c.default]).toEqual(["a", "b", "c"]);
	const scope = __webpack_share_scopes__.default;
	expect(Object.keys(scope["lib/a"])).toEqual(["1.0.0"]);
	expect(scope["lib/b"]).toBe(undefined);
	expect(scope["lib/c"]).toBe(undefined);
});

it("should not provide a relative module excluded by its version", async () => {
	await __webpack_init_sharing__("default");
	const { default: local } = await import("./local");
	expect(local).toBe("local");
	expect(__webpack_share_scopes__.default.local).toBe(undefined);
});
