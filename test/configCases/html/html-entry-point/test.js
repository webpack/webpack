const fs = require("fs");
const path = require("path");

const readFile = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should emit page.html for an HTML entry without explicit extract: true", () => {
	const extracted = readFile("page.html");
	expect(extracted).toMatchSnapshot();
	expect(extracted).not.toContain('src="./script.js"');
	expect(extracted).not.toContain('src="./image.png"');
	expect(extracted).toMatch(/<script src="__html_[a-f0-9]+_0\.chunk\.js">/);
	expect(extracted).toMatch(/<img src="[a-f0-9]+\.png" alt="image">/);
});
