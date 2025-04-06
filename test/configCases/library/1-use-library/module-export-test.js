import * as mod from "library";

it("should tree-shake other exports from library (" + NAME + ") and export only 'a'", function() {
	expect(mod).toMatchObject({ a: "a" });
});
