it("should load only used exports", async () => {
	await import("../statical-dynamic-import/dir1/a").then(({ default: defaultValue, usedExports }) => {
		expect(defaultValue).toBe(3);
		expect(usedExports).toEqual(["default", "usedExports"]);
	})
});

it("should get warning on using 'webpackExports' with statically analyze-able dynamic import", async () => {
	await import(/* webpackExports: ["default"] */"../statical-dynamic-import/dir1/a?2").then(({ a }) => {
		expect(a).toBe(1);
	})
});

it("should not tree-shake default export for exportsType=default module", async () => {
	await import("../statical-dynamic-import/dir2/json/object.json").then(({ default: defaultValue }) => {
		expect(defaultValue).toEqual({ a: 1 });
	});
	await import("../statical-dynamic-import/dir2/json/array.json").then(({ default: defaultValue }) => {
		expect(defaultValue).toEqual(["a"]);
	});
	await import("../statical-dynamic-import/dir2/json/primitive.json").then(({ default: defaultValue }) => {
		expect(defaultValue).toBe("a");
	});
	await import("../statical-dynamic-import/dir2/a").then(({ default: defaultValue }) => {
		expect(defaultValue).toEqual({ a: 1, b: 2 });
	});
});

it("should not tree-shake default export for exportsType=default context module", async () => {
	const dir = "json";
	await import(`../statical-dynamic-import/dir3/${dir}/object.json`).then(({ default: defaultValue }) => {
		expect(defaultValue).toEqual({ a: 1 });
	});
	await import(`../statical-dynamic-import/dir3/${dir}/array.json`).then(({ default: defaultValue }) => {
		expect(defaultValue).toEqual(["a"]);
	});
	await import(`../statical-dynamic-import/dir3/${dir}/primitive.json`).then(({ default: defaultValue }) => {
		expect(defaultValue).toBe("a");
	});
	const file = "a";
	await import(`../statical-dynamic-import/dir3/${file}`).then(({ default: defaultValue }) => {
		expect(defaultValue).toEqual({ a: 1, b: 2 });
	});
});

it("should walk with correct order", async () => {
	var r;
	await import(`./dir1/a${r = require, ".js"}`).then(({ a, usedExports }) => {
		expect(r("./required").value).toBe(42);
		expect(a).toBe(1);
		expect(usedExports).toEqual(["a", "usedExports"]);
	});
})
