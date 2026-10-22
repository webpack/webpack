import m1 from "./m1";
import m2 from "./m2";

it("should preserve the exports pair12 holds", () => {
	expect([m1, m2]).toEqual(["module-1", "module-2"]);
});
