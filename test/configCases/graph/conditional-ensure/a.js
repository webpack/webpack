import c1 from "./c1";

it("should allow to import an conditionally unneeded chunk", async () => {
	const c2 = await c1();
	const c1_ = await c2.default();
	expect(c1_.value).toBe(1);
});
