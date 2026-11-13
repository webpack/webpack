const widget = require("./widget");

it("should keep requires in unused object-literal methods valid code", () => {
	expect(widget.used()).toBe(1);
	const source = String(__webpack_modules__["./widget.js"]);
	expect(source).not.toMatch(/__webpack_require__\s*0/);
});
