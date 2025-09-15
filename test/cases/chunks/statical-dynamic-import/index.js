it("should load only used exports", async (done) => {
	const m = await import("./dir1/a");
	expect(m.default).toBe(3);
	expect(m.usedExports).toEqual(["default", "usedExports"]);
	done();
});

it("should get warning on using 'webpackExports' with statically analyze-able dynamic import", async (done) => {
	const m = await import(/* webpackExports: ["default"] */"./dir1/a?2");
	expect(m.a).toBe(1);
	done();
});

it("should not tree-shake default export for exportsType=default module", async () => {
	const m1 = await import("./dir2/json/object.json");
	const m2 = await import("./dir2/json/array.json");
	const m3 = await import("./dir2/json/primitive.json");
	expect(m1.default).toEqual({ a: 1 });
	expect(m2.default).toEqual(["a"]);
	expect(m3.default).toBe("a");
	const m4 = await import("./dir2/a");
	expect(m4.default).toEqual({ a: 1, b: 2 });
});

it("should not tree-shake default export for exportsType=default context module", async () => {
	const dir = "json";
	const m1 = await import(`./dir3/${dir}/object.json`);
	const m2 = await import(`./dir3/${dir}/array.json`);
	const m3 = await import(`./dir3/${dir}/primitive.json`);
	expect(m1.default).toEqual({ a: 1 });
	expect(m2.default).toEqual(["a"]);
	expect(m3.default).toBe("a");
	const file = "a";
	const m4 = await import(`./dir3/${file}`);
	expect(m4.default).toEqual({ a: 1, b: 2 });
});

it("should not tree-shake if reassigin", async () => {
	let m = await import("./dir1/a?3");
	expect(m.default).toBe(3);
	expect(m.usedExports).toBe(true);
	m = {};
})

it("should tree-shake if its member call and strictThisContextOnImports is false", async () => {
	let m = await import("./dir4/a");
	expect(m.f()).toBe(undefined);
	expect(m.usedExports).toEqual(["f", "usedExports"]);
	let m2 = await import("./dir4/lib");
	expect(m2.b.f()).toBe(1);
	expect(m2.b.usedExports).toEqual(true);
	expect(m2.usedExports).toEqual(["b", "usedExports"]);
})

it("should analyze arguments in call member chain", async () => {
	let m = await import("./dir4/lib?2");
	m.b.f((async () => {
		let m2 = await import("./dir4/a?2");
		expect(m2.a).toBe(1);
		expect(m2.usedExports).toEqual(["a", "usedExports"]);
	})());
})
