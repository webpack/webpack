const fs = require("fs");
const path = require("path");

const read = (file) => fs.readFileSync(path.resolve(__dirname, file), "utf-8");

it("mirrors output.crossOriginLoading onto the injected script", () => {
	const html = read("main.html");
	const script = html.match(/<script\b[^>]*><\/script>/)[0];
	expect(script).toContain('crossorigin="anonymous"');
	expect(script).toMatch(/src="[^"]+\.js"/);
});

it("mirrors output.crossOriginLoading onto the extracted stylesheet link", () => {
	const html = read("main.html");
	const link = html.match(/<link\b[^>]*>/)[0];
	expect(link).toContain('crossorigin="anonymous"');
	expect(link).toMatch(/href="[^"]+\.css"/);
});
