import "./style.css";

it("should handle HMR for exportType style", function (done) {
	const styles = window.document.getElementsByTagName("style");
	expect(styles.length).toBeGreaterThan(0);
	const styleElement = styles[styles.length - 1];
	expect(styleElement.nodeName).toBe("STYLE");
	expect(styleElement.textContent).toContain(".style-class");
	expect(styleElement.textContent).toContain("color: red");
	expect(styleElement.textContent).toContain("background-color: blue");
	expect(styleElement.textContent).toContain("padding: 10px");

	const originalTextContent = styleElement.textContent;

	NEXT(require("../../update")(done, true, () => {
		const styles = window.document.getElementsByTagName("style");
		const updatedStyleElement = styles[styles.length - 1];
		expect(updatedStyleElement.textContent).toContain(".style-class");
		expect(updatedStyleElement.textContent).toContain("color: green");
		expect(updatedStyleElement.textContent).toContain("background-color: yellow");
		expect(updatedStyleElement.textContent).toContain("padding: 20px");
		expect(updatedStyleElement.textContent).not.toBe(originalTextContent);
		done();
	}));
});

module.hot.accept();

