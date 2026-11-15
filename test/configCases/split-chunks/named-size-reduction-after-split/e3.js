import a from "./a";
import c from "./c";
import d from "./d";
import f from "./f";

it("should load the split modules of e3", () => {
	expect([a, c, d, f]).toEqual(["a", "c", "d", "f"]);
});
