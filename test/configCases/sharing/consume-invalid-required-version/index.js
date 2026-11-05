it("should fall back to the local modules when the required version is unusable", async () => {
	expect((await import("plus-range")).default).toBe("plus-range");
	expect((await import("dash-range")).default).toBe("dash-range");
	expect((await import("number-range")).default).toBe("number-range");
});

it("should not take a parent required version over an unusable local one", async () => {
	expect((await import("./nested")).default).toBe("nested-number-range");
	const consumes = __STATS__.modules.filter((m) =>
		m.name.startsWith("consume shared module (default) nested-number-range@")
	);
	expect(consumes).toHaveLength(1);
	expect(consumes[0].name).toMatch(/nested-number-range@\* /);
});

it("should take the first declaration of a package, even an unusable one", async () => {
	expect((await import("mixed-range")).default).toBe("mixed-range");
	const consumes = __STATS__.modules.filter((m) =>
		m.name.startsWith("consume shared module (default) mixed-range@")
	);
	expect(consumes).toHaveLength(1);
	expect(consumes[0].name).toMatch(/mixed-range@\* /);
});
