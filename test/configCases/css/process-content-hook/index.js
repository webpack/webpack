it("should process CSS content via processContent hook", () => {
	const exportType = EXPORT_TYPE;

	if (exportType === "text") {
		const text = require("./style.css").default;
		// rgba(255, 0, 0, 1) should be replaced with "red"
		expect(text).not.toMatch(/rgba/);
		expect(text).toMatch(/color:\s*red/);

		const moduleText = require("./style.module.css").default;
		expect(moduleText).not.toMatch(/rgba/);
		expect(moduleText).toMatch(/color:\s*red/);
	} else if (exportType === "css-style-sheet") {
		const style = require("./style.css");
		expect(style["test-class"]).toBeTruthy();

		const moduleStyle = require("./style.module.css");
		expect(moduleStyle["module-class"]).toBeTruthy();
	} else if (exportType === "style") {
		const style = require("./style.css");
		expect(style["test-class"]).toBeTruthy();

		const moduleStyle = require("./style.module.css");
		expect(moduleStyle["module-class"]).toBeTruthy();
	}
});
