import a from "./a";
import b from "./b";

it("should load fine", () => {
	expect(b).toBe("b");
	return a.then(a => expect(a).toEqual(nsObj({ default: "b" })));
});
