import ns from "./module";

it("should only mark the accessed properties of a namespace exported as default", () => {
	expect(ns.member.name).toBe("member");
	// `export default ns` must track usage like `export { ns as default }` does,
	// instead of falling back to "the whole namespace object is referenced"
	expect(ns.usedExportsOfSource.sort()).toEqual(
		["member", "usedExportsOfSource"].sort()
	);
});
