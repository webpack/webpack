import "./global.less";
import * as style1 from "./style1.module.less";
import * as style2 from "./style2.modules.less";

it("should correctly compile css/auto", () => {
	const style = getComputedStyle(document.body);
	expect(style.getPropertyValue("color")).toBe(" green");
	expect(style1.class).toBe("./style1.module.less-class");
	expect(style2.class).toBe("./style2.modules.less-class");
});
