import a from "./a";
import b from "./b";
import c from "./c";
import d from "./d";

it("should load the split modules of e1", () => {
	expect([a, b, c, d]).toEqual(["a", "b", "c", "d"]);
});
