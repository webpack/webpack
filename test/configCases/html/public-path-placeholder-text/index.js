const fs = require("fs");
const path = require("path");

const page = require("./page.html");
const fragment = require("./fragment.html");

const PLACEHOLDER = ["__WEBPACK", "CSS_PUBLIC_PATH_AUTO__"].join("_");

const readFile = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should keep placeholder text written in an emitted page", () => {
	const extracted = readFile("page.html");
	expect(extracted).toContain(`<title>a${PLACEHOLDER}b</title>`);
	expect(extracted).toContain(
		`<a href="c${PLACEHOLDER}d">e${PLACEHOLDER}f</a>`
	);
	expect(extracted).toContain(`{"g":"h${PLACEHOLDER}i"}`);
	const srcdoc = /srcdoc="([^"]*)"/.exec(extracted)[1].replace(/&#95;/g, "_");
	expect(srcdoc).toContain(`<p>n${PLACEHOLDER}o</p>`);
	expect(srcdoc).toMatch(/<img src=(?:&quot;)?[a-f0-9]+\.png/);
	// The URLs webpack wrote still resolve.
	expect(extracted).toMatch(/<script src="entry\.js">/);
	expect(extracted).toMatch(/<img src="[a-f0-9]+\.png" alt="image">/);
});

it("should keep placeholder text written in a page exported to js", () => {
	expect(page).toContain(`<title>a${PLACEHOLDER}b</title>`);
	expect(page).toContain(`{"g":"h${PLACEHOLDER}i"}`);
	expect(page).toMatch(/<script src="entry\.js">/);
	expect(page).toMatch(/<img src="[a-f0-9]+\.png" alt="image">/);
});

it("should keep placeholder text written in an html fragment", () => {
	expect(fragment).toContain(
		`<a href="j${PLACEHOLDER}k">l${PLACEHOLDER}m</a>`
	);
	expect(fragment).toMatch(/<img src="[a-f0-9]+\.png">/);
});
