import m0 from "./m0";
import m1 from "./m1";

it("should preserve the exports pair01 holds", () => {
	expect([m0, m1]).toEqual(["module-0", "module-1"]);
});
