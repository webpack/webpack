import { __ as i18n } from "./i18n";

function unused() {
	return i18n("wtf");
}

const __ = "local";

it("should correctly handle unused function with same-named local variable", () => {
	expect(__).toBe("local");
});

it("should declare inactive harmony imports as variables", () => {
	const fs = require("fs");
	const source = fs.readFileSync(__filename, "utf-8");
	// The identifier should remain in the code, but be declared as undefined
	expect(source).toContain("var i18n = /* inactive harmony import i18n __ */ undefined;");
	expect(source).toMatch(/return i18n\("wtf"\)/);
});

// This ensures unused is not tree-shaken in some configurations
export { unused };
