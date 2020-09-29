import a from "./a";

it("should load fine", () => {
	return a.then(a => expect(a).toEqual(nsObj({ default: "b" })));
});
