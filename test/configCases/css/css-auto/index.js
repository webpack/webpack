import "./global.less";
import * as style1 from "./style1.module.less";
import * as style2 from "./style2.modules.less";
import * as style3 from "./style3.module.less!=!./loader.js!./style3.module.js";

it("should correctly compile css/auto", () => {
	const style = getComputedStyle(document.body);
	expect(style.getPropertyValue("color")).toBe(" green");
	expect(style.getPropertyValue("background")).toBe(" #f00");
	expect(style1.class).toBe("./style1.module.less-class");
	expect(style2.class).toBe("./style2.modules.less-class");
	expect(style3.class).toBe("./style3.module.less!=!./loader.js!./style3.module.js-class");
});
