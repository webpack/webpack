import list from "./list.cjs";

it("should preserve a JSON array when calling a prototype method through a CommonJS reexport", () => {
	expect(list.map((value) => value.toUpperCase())).toEqual(["MD", "MARKDOWN"]);
});
