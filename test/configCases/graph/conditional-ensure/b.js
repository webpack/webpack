import c2 from "./c2";

it("should allow to import an conditionally unneeded chunk", async () => {
	const c1 = await c2();
	const c2_ = await c1.default();
	expect(c2_.value).toBe(2);
});
