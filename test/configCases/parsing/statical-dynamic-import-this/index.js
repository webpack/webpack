it("should respect strictThisContextOnImports for member call", async () => {
	let m = await import("./dir4/a");
	expect(m.f()).toBe(1);
	expect(m.usedExports).toBe(true);
	let m2 = await import("./dir4/lib");
	expect(m2.b.f()).toBe(1);
	expect(m2.b.usedExports).toBe(true);
	expect(m2.usedExports).toEqual(["b", "usedExports"]);
})

it("should respect strictThisContextOnImports for member call in then", async () => {
	await import("./dir4/a").then(m => {
		expect(m.f()).toBe(1);
		expect(m.usedExports).toBe(true);
	});
	await import("./dir4/lib").then(m2 => {
		expect(m2.b.f()).toBe(1);
		expect(m2.b.usedExports).toBe(true);
		expect(m2.usedExports).toEqual(["b", "usedExports"]);
	});
})
