// Dynamic import of third-party scoped/namespaced packages, see #6360.

it("should dynamically import a scoped package with the slash in the literal", async () => {
	const results = [];
	for (const name of ["pkg-a", "pkg-b"]) {
		const m = await import(`@scope/${name}`);
		results.push(m.default.name);
	}
	expect(results).toEqual(["pkg-a", "pkg-b"]);
});

it("should dynamically import a scoped package with the slash in the expression", async () => {
	const results = [];
	for (const segment of ["/pkg-a", "/pkg-b"]) {
		const m = await import(`@scope${segment}`);
		results.push(m.default.name);
	}
	expect(results).toEqual(["pkg-a", "pkg-b"]);
});
