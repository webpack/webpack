it("should load d from the block found when p grows", async () => {
	const q = await import("./q");
	const p2 = await q.loadP2();
	expect(p2.default).toBe("b");
	expect((await p2.loadD()).default).toBe("d");
	expect((await p2.loadC()).default).toEqual(["a", "b"]);
});
