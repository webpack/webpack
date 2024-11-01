import * as styles1 from "./style.less";
import * as styles2 from "./style.modules.less";

it("should prefer relative", () => {
	expect(styles1).toEqual(nsObj({}));
	expect(styles2).toEqual(nsObj({
		"style-module": "_style_modules_less-style-module",
	}));

	const style = getComputedStyle(document.body);

	expect(style.getPropertyValue("background")).toBe(" red");
	expect(style.getPropertyValue("color")).toBe(" red");
});
