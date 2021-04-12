import a from "./a";
import b from "./b";
import c from "./c";

it("should invalidate modules when properties are added/removed from the DefinePlugin", () => {
	expect(a).toEqual([1, 1]);
	expect(b).toEqual([2, 0]);
	expect(c).toEqual([undefined, 0]);
});
