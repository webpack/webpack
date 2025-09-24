it("should load only used exports", async () => {
	await import("../statical-dynamic-import/dir1/a").then(m => {
		expect(m.default).toBe(3);
		expect(m.usedExports).toEqual(["default", "usedExports"]);
	})
});

it("should get warning on using 'webpackExports' with statically analyze-able dynamic import", async () => {
	await import(/* webpackExports: ["default"] */"../statical-dynamic-import/dir1/a?2").then(m => {
		expect(m.a).toBe(1);
	})
});

it("should not tree-shake default export for exportsType=default module", async () => {
	await import("../statical-dynamic-import/dir2/json/object.json").then(m1 => {
		expect(m1.default).toEqual({ a: 1 });
	});
	await import("../statical-dynamic-import/dir2/json/array.json").then(m2 => {
		expect(m2.default).toEqual(["a"]);
	});
	await import("../statical-dynamic-import/dir2/json/primitive.json").then(m3 => {
		expect(m3.default).toBe("a");
	});
	await import("../statical-dynamic-import/dir2/a").then(m4 => {
		expect(m4.default).toEqual({ a: 1, b: 2 });
	});
});

it("should not tree-shake default export for exportsType=default context module", async () => {
	const dir = "json";
	await import(`../statical-dynamic-import/dir3/${dir}/object.json`).then(m1 => {
		expect(m1.default).toEqual({ a: 1 });
	});
	await import(`../statical-dynamic-import/dir3/${dir}/array.json`).then(m2 => {
		expect(m2.default).toEqual(["a"]);
	});
	await import(`../statical-dynamic-import/dir3/${dir}/primitive.json`).then(m3 => {
		expect(m3.default).toBe("a");
	});
	const file = "a";
	await import(`../statical-dynamic-import/dir3/${file}`).then(m4 => {
		expect(m4.default).toEqual({ a: 1, b: 2 });
	});
});

it("should not tree-shake if reassigin", async () => {
	await import("../statical-dynamic-import/dir1/a?3").then(m => {
		expect(m.default).toBe(3);
		expect(m.usedExports).toBe(true);
		m = {};
	});
})

it("should tree-shake if its member call and strictThisContextOnImports is false", async () => {
	await import("../statical-dynamic-import/dir4/a").then(m => {
		expect(m.f()).toBe(undefined);
		expect(m.usedExports).toEqual(["f", "usedExports"]);
	});
	await import("../statical-dynamic-import/dir4/lib").then(m2 => {
		expect(m2.b.f()).toBe(1);
		expect(m2.b.usedExports).toEqual(true);
		expect(m2.usedExports).toEqual(["b", "usedExports"]);
	});
})

it("should walk with correct order", async () => {
	var r;
	await import(`./dir1/a${r = require, ".js"}`).then(m => {
		expect(r("./required").value).toBe(42);
		expect(m.a).toBe(1);
		expect(m.usedExports).toEqual(["a", "usedExports"]);
	});
});

it("should analyze arguments in call member chain", async () => {
	await import("../statical-dynamic-import/dir4/lib?2").then(m => {
		m.b.f((async () => {
			await import("../statical-dynamic-import/dir4/a?2").then(m2 => {
				expect(m2.a).toBe(1);
				expect(m2.usedExports).toEqual(["a", "usedExports"]);
			});
		})());
	});
});
