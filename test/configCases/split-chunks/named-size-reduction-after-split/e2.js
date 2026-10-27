import a from "./a";
import b from "./b";
import c from "./c";
import d from "./d";
import f from "./f";

it("should load the split modules of e2", () => {
	expect([a, b, c, d, f]).toEqual(["a", "b", "c", "d", "f"]);
});
