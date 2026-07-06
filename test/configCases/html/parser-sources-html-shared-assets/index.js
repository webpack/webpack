const fs = require("fs");
const path = require("path");

const home = require("./home.html");

const readFile = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");
const exists = (name) => fs.existsSync(path.resolve(__dirname, name));

it("links a second page through a `type: html` href", () => {
	expect(home).toContain('<a href="about.html">About</a>');
});

it("handles a script and stylesheet shared between the two pages", () => {
	const about = readFile("about.html");
	// Both pages are processed as their own page; the script and stylesheet
	// they share are each emitted and referenced from both pages, with no
	// entry-name collision and no dangling reference.
	for (const page of [home, about]) {
		const js = page.match(/<script[^>]*src="([^"]+\.js)"/);
		const css = page.match(/<link rel="stylesheet" href="([^"]+\.css)">/);
		expect(js).not.toBeNull();
		expect(css).not.toBeNull();
		expect(exists(js[1])).toBe(true);
		expect(exists(css[1])).toBe(true);
	}
	expect(about).toMatchSnapshot();
});
