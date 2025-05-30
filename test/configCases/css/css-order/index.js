it("should keep the order", function() {
	const { component } = require("./component");
	expect(component()).toBe(true);

	const fs = require("fs");
	const path = require("path");
	const source = fs.readFileSync(
		path.resolve(__dirname, "main.css"),
		"utf-8"
	);

	// First imported css
	const dependencyCssPos = source.indexOf(".dependency");
	expect(dependencyCssPos).not.toBe(-1);
	// Second imported css
	const componentCssPos = source.indexOf(".component");
	expect(componentCssPos).not.toBe(-1);

	expect(componentCssPos).toBeGreaterThan(dependencyCssPos);
});
