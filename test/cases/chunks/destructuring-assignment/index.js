it("should load only used exports", async (done) => {
	const { default: def, usedExports } = await import("./dir1/a");
	expect(def).toBe(3);
	expect(usedExports).toEqual(["default", "usedExports"]);
	done();
});

it("should get warning on using 'webpackExports' with destructuring assignment", async (done) => {
	const { default: def } = await import(/* webpackExports: ["a"] */"./dir1/a?2");
	expect(def).toBe(3);
	done();
});

it("should not tree-shake default export for exportsType=default module", async () => {
	const { default: object } = await import("./dir2/json/object.json");
	const { default: array } = await import("./dir2/json/array.json");
	const { default: primitive } = await import("./dir2/json/primitive.json");
	expect(object).toEqual({ a: 1 });
	expect(array).toEqual(["a"]);
	expect(primitive).toBe("a");
	const { default: a } = await import("./dir2/a");
	expect(a).toEqual({ a: 1, b: 2 });
});

it("should not tree-shake default export for exportsType=default context module", async () => {
	const dir = "json";
	const { default: object } = await import(`./dir3/${dir}/object.json`);
	const { default: array } = await import(`./dir3/${dir}/array.json`);
	const { default: primitive } = await import(`./dir3/${dir}/primitive.json`);
	expect(object).toEqual({ a: 1 });
	expect(array).toEqual(["a"]);
	expect(primitive).toBe("a");
	const file = "a";
	const { default: a } = await import(`./dir3/${file}`);
	expect(a).toEqual({ a: 1, b: 2 });
});
