import * as style from "./style.modules.css";

it("should allow to import a css module", () => {
	expect(style.header).toContain("header");
	expect(style.header).toContain("base");
});
