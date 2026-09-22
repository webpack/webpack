import m0 from "./m0";
import m1 from "./m1";
import m2 from "./m2";
import m4 from "./m4";

it("should preserve the exports c3 holds", () => {
	expect([m0, m1, m2, m4]).toEqual(["module-0", "module-1", "module-2", "module-4"]);
});
