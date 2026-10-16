import * as library from "./library.mjs";

const fs = require("fs");
const path = require("path");

it("should leave a free global of another module unshadowed", () => {
	expect(library.readCounter()).toBe("undefined");
});

it("should keep names it cannot move out of their modules", () => {
	expect(library.shared).toBe("a");
	expect(library.other).toBe("b");
	const source = fs.readFileSync(path.join(__dirname, "library.mjs"), "utf8");
	expect(source).toContain("let counter = 0;");
	expect(source).toContain("let length = 0;");
	expect(source).toContain('let shared = "a";');
	expect(source).toContain('let shared = "b";');
});
