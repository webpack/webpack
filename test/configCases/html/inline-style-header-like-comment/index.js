const fs = require("fs");
const path = require("path");

it("should keep a <style> comment that only starts like a module header", () => {
	const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	expect(page).toContain(".keep { color: red; }");
	expect(page).toContain(".after { color: blue; }");
});
