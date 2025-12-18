import fs from "fs";

it(`should generate import statement for built-in module in node`, () => {
	const path = require("path");
	const content = fs.readFileSync(__filename, "utf-8");

	expect(content).toMatch(/import(.*)from(\s*)"fs"/);
	expect(content).toMatch(/import(.*)from(\s*)"path"/);
	expect(path.basename(__filename)).toBe("bundle0.mjs");
});
