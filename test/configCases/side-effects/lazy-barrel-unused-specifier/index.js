import style from "lib";

it("should not report a name a barrel only defers", () => {
	expect(typeof style()).toBe("function");
});

it("should keep every deferred re-export target unbuilt", () => {
	const built = __STATS__.modules
		.map((m) => m.name)
		.filter((name) => /lib\/[a-z]+\/(value|mid)\.js$/.test(name));
	expect(built).toEqual([]);
});
