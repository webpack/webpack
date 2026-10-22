const load = (name) => import(`app/${name}?query#hash`);

it("should resolve an element against the directory it was found in", async () => {
	expect((await load("nested/a.js")).default).toBe("first/nested/a");
	expect((await load("other/b.js")).default).toBe("second/other/b");
});

it("should pass the query and fragment on to each element", async () => {
	const first = await load("nested/a.js");
	expect(first.query).toBe("?query");
	expect(first.fragment).toBe("#hash");
	const second = await load("other/b.js");
	expect(second.query).toBe("?query");
	expect(second.fragment).toBe("#hash");
});

it("should take an element both directories hold from the first one", async () => {
	expect((await load("shared.js")).default).toBe("first/shared");
});
