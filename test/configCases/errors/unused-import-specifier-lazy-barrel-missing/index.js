import style from "lib/style.js";

it("should still report a name the lazy barrel does not defer", () => {
	expect(style()()).toBe(1);
});
