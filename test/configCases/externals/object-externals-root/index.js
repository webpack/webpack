const fs = require("fs");
const path = require("path");

it("should correct resolve object externals root", function() {
	const content = fs.readFileSync(path.resolve(__dirname, "other.js"), "utf-8");
	expect(content).toContain(`module.exports = require("external111")`);
	expect(content).toContain(`const external1_2 = Promise.resolve`);
	expect(content).toContain(`module.exports = import("external222")`);
	expect(content).toContain(`module.exports = window["external333"]`);
});
