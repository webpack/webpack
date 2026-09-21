import m0 from "./m0";
import m1 from "./m1";
import m2 from "./m2";

it("should preserve the exports b holds", () => {
	expect([m0, m1, m2]).toEqual(["module-0", "module-1", "module-2"]);
});
