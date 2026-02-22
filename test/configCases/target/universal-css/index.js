import * as pureStyle from "./style.css";
import * as styles from "./style.modules.css";
import * as pureStyle2 from "./style2.css";
import * as styles2 from "./style2.modules.css";

it("should load initial CSS", () => {
	expect(pureStyle).toEqual({});

	if (typeof document !== "undefined") {
		const style = getComputedStyle(document.body);
		expect(style.getPropertyValue("background")).toBe(" red");
	}
});

it("should load CSS modules", () => {
	expect(styles.foo).toBe("style_modules_css-foo");
});

it("should load split CSS chunk", () => {
	expect(pureStyle2).toEqual({});
});

it("should load split CSS modules", () => {
	expect(styles2.bar).toBe("style2_modules_css-bar");
});
