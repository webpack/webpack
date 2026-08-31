import style from "lib/style.js";

it("should not report a missing export for a specifier the lazy barrel never resolved", () => {
	expect(style()()).toBe(1);
});
