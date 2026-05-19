const load = async () => {
	const module = await import("./async-dep.js");
	return module.compute("test");
};

it("should work", async () => {
	expect(await load()).toBe("processed-test");
});
