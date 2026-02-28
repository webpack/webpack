import "./style.css";

it("should inject styles into DOM when exportType is style", () => {
	const styles = window.document.getElementsByTagName("style");
	expect(styles.length).toBeGreaterThan(0);
	const styleElement = styles[styles.length - 1];
	expect(styleElement.nodeName).toBe("STYLE");
	expect(styleElement.textContent).toContain(".style_css-style-class");
	expect(styleElement.textContent).toContain("color: red");
	expect(styleElement.textContent).toContain("background-color: blue");
	expect(styleElement.textContent).toContain("padding: 10px");
	
	const styleImported = styles[styles.length - 2];
	expect(styleImported.textContent).toContain("margin: 10px");
});

