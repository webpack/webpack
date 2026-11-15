import a from "./a";

it("should load a into c after p loses it", async () => {
	expect(a).toBe("a");
	const p1 = await import(/* webpackChunkName: "p" */ "./p1");
	const c = await p1.loadC();
	expect(c.default).toEqual(["a", "b"]);
});
