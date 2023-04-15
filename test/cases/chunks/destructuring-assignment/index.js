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
