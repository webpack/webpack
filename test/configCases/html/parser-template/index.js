import page from "./page.html";

it("should run the parser template before parsing the html", () => {
	// The template replaces `{{title}}` before the parser runs, so the
	// rendered html carries the substituted text and no placeholder is left.
	expect(page).toContain("<title>Hello world</title>");
	expect(page).not.toContain("{{title}}");
});

it("should extract URLs the template injects as dependencies", () => {
	// `{{image}}` becomes `./image.png` before parsing, proving the template
	// runs first: the injected value is treated as a real `<img src>`
	// dependency and rewritten to the emitted asset filename.
	expect(page).not.toContain("{{image}}");
	expect(page).not.toContain('src="./image.png"');
	expect(page).toMatch(/<img src="[^"]+\.png" alt="image">/);
});
