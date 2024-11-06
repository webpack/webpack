import "./global.less";
import * as style1 from "./style1.module.less";
import * as style2 from "./style2.modules.less";
import * as style3 from "./style3.module.less!=!./loader.js!./style3.module.js";
import * as style4 from "./style4.module.less!=!./loader.js!./style4.js";
import * as style5 from "./style5.module.css!=!./loader.js!./style4.js";

it("should correctly compile css/auto", () => {
	const style = getComputedStyle(document.body);
	expect(style.getPropertyValue("color")).toBe(" green");
	expect(style.getPropertyValue("background")).toBe(" #f00");
	expect(style1.class).toBe("_style1_module_less-class");
	expect(style2.class).toBe("_style2_modules_less-class");
	expect(style3.class).toBe("_style3_module_less_loader_js_style3_module_js-class");
	expect(style4.class).toBe("_style4_module_less_loader_js_style4_js-class");
	expect(style5.class).toBe("_style5_module_css_loader_js_style4_js-class");
});
