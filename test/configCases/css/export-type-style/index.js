import { "style-class" as styleClass } from "./style.css";
import { "module-class" as moduleClass } from "./style.module.css";

it("should export CSS module classes from style.module.css", () => {
	expect(styleClass).toBe("style_css-style-class");
	expect(moduleClass).toBe("style_module_css-module-class");
});

it("should inject styles into DOM when exportType is style", () => {
	if (!process.env.BROWSER) {
		expect(true).toBe(true);
		return;
	}
	const styles = window.document.getElementsByTagName("style");
	expect(styles.length).toBeGreaterThan(0);
	const styleElement = styles[1];
	expect(styleElement.nodeName).toBe("STYLE");
	expect(styleElement.textContent).toContain(".style_css-style-class");
	expect(styleElement.textContent).toContain("color: red");
	expect(styleElement.textContent).toContain("background-color: blue");
	expect(styleElement.textContent).toContain("padding: 10px");
	
	const styleImported = styles[0];
	expect(styleImported.textContent).toContain("margin: 10px");
});

