import m0 from "./m0";
import m1 from "./m1";
import m2 from "./m2";
import m3 from "./m3";
import m4 from "./m4";

it("should preserve the exports a holds", () => {
	expect([m0, m1, m2, m3, m4]).toEqual(["module-0", "module-1", "module-2", "module-3", "module-4"]);
});
