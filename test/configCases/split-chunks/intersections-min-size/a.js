import a from "./m0";
import b from "./m1";
import c from "./m2";

it("loads every module through the intersected shared chunk", () => {
	expect([a, b, c]).toEqual(["module-0", "module-1", "module-2"]);
});
