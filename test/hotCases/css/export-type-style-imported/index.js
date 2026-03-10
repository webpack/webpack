import "./foo.css";

it("should handle HMR for exportType style with @import", function (done) {
	const styles = window.document.getElementsByTagName("style");
	expect(styles.length).toBeGreaterThan(0);
	const styleElement = styles[styles.length - 1];

	const styleElement2 = styles[styles.length - 2];
	expect(styleElement2.nodeName).toBe("STYLE");
	expect(styleElement2.textContent).toContain("bar-v1");
	expect(styleElement.textContent).toContain(".foo");

	const originalTextContent = styleElement2.textContent;
	NEXT(require("../../update")(done, true, () => {
	const styles = window.document.getElementsByTagName("style");
		const updatedStyleElement = styles[styles.length - 1];
		const updatedStyleElement2 = styles[styles.length - 2];

		expect(updatedStyleElement2.textContent).toContain("bar-v2");
		expect(updatedStyleElement.textContent).toContain(".foo");
		expect(updatedStyleElement2.textContent).not.toBe(originalTextContent);
		done();
	}));
});

module.hot.accept();