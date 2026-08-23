// A lazy context: every match becomes a chunk of its own, and the pattern
// webpack derives here is `^\.\/.*\.js$` rather than the catch-all.
const load = (name) => import(`./locale/${name}.js`);

it("should warn about a lazy context matching a whole directory", () =>
	load("aa").then((m) => {
		expect(m.default).toContain("aa");
	}));
