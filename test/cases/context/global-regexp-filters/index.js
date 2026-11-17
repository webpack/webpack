it("should exclude every match of a global webpackExclude regexp", () => {
	const load = (name) => import(/* webpackExclude: /x[1-4]\.js$/g */ `./dir/${name}.js`);
	return Promise.all(
		["x1", "x2", "x3", "x4"].map((name) =>
			expect(load(name)).rejects.toThrow(`Cannot find module './${name}.js'`)
		)
	);
});

it("should include every match of a global webpackInclude regexp", async () => {
	const load = (name) => import(/* webpackInclude: /y[1-4]\.js$/g */ `./dir/${name}.js`);
	for (const name of ["y1", "y2", "y3", "y4"]) {
		expect((await load(name)).default).toBe(name);
	}
	await expect(load("x1")).rejects.toThrow("Cannot find module './x1.js'");
});

