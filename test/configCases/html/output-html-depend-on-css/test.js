const fs = require("fs");
const path = require("path");

const read = (file) => fs.readFileSync(path.resolve(__dirname, file), "utf-8");

it("injects the dependOn target's stylesheet into the dependant page", () => {
	const html = read("app.html");
	expect(html).toMatch(/<link rel="stylesheet" href="[^"]+\.css">/);
});

it("loads the stylesheet before the script that needs it", () => {
	const html = read("app.html");
	const linkIndex = html.indexOf('rel="stylesheet"');
	const scriptIndex = html.indexOf("<script");
	expect(linkIndex).toBeGreaterThanOrEqual(0);
	expect(scriptIndex).toBeGreaterThanOrEqual(0);
	expect(linkIndex).toBeLessThan(scriptIndex);
});
