import m0 from "./m0";
import m2 from "./m2";

it("should preserve the exports pair02 holds", () => {
	expect([m0, m2]).toEqual(["module-0", "module-2"]);
});
