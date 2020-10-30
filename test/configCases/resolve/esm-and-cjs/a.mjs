import b from "./b.cjs";

it("should load cjs from mjs", () => {
	expect(b.foo).toEqual("bar");
});
