const fs = require("fs");
const path = require("path");

const read = (file) => fs.readFileSync(path.resolve(__dirname, file), "utf-8");
const count = (str, sub) => str.split(sub).length - 1;

it("mirrors output.crossOriginLoading onto the injected script and stylesheet", () => {
	const html = read("main.html");
	expect(html).toMatch(/src="[^"]+\.js"/);
	expect(html).toMatch(/href="[^"]+\.css"/);
	// both the script and the extracted stylesheet carry the attribute
	expect(count(html, 'crossorigin="anonymous"')).toBe(2);
});
