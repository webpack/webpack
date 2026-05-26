const fs = require("fs");
const path = require("path");

it("should resolve the extensionless `./src` entry to src/index.css", () => {
	const css = fs.readFileSync(path.resolve(__dirname, "main.css"), "utf-8");
	expect(css).toContain(".default-entry");
});
