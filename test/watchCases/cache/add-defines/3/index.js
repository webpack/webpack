import a from "./a";
import b from "./b";
import c from "./c";

it("should invalidate modules when properties are added/removed from the DefinePlugin", () => {
	expect(a).toEqual([1, 2]);
	expect(b).toEqual([undefined, 3]);
	expect(c).toEqual([3, 2]);
});
