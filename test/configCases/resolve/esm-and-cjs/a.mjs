import b from "./b.cjs";

it("should resolve both alternatives", () => {
	expect(b.foo).toEqual("bar");
});
