import m1 from "./m1";

it("should preserve the exports c1 holds", () => {
	expect([m1]).toEqual(["module-1"]);
});
