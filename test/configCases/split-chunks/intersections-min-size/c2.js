import m2 from "./m2";

it("should preserve the exports c2 holds", () => {
	expect([m2]).toEqual(["module-2"]);
});
