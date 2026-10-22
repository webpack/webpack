import m0 from "./m0";

it("should preserve the exports c0 holds", () => {
	expect([m0]).toEqual(["module-0"]);
});
