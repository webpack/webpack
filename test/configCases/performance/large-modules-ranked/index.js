it("should rank every module that carries a chunk", async () => {
	const one = await import(/* webpackChunkName: "one" */ "./fat-one");
	const two = await import(/* webpackChunkName: "two" */ "./fat-two");
	const a = await import("./holds-a");
	const b = await import("./holds-b");

	expect(one.default.length).toBe(60000);
	expect(two.default.length).toBe(60000);
	expect(a.default).toBe(b.default);
});
