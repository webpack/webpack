"use strict";

const page = require("./page.html");

it("should upgrade an untyped script tag to type=module when scriptModule is on", () => {
	expect(typeof page).toBe("string");
	// The original source paths are rewritten to emitted chunks.
	expect(page).not.toContain('src="./app.js"');
	expect(page).not.toContain('src="./mod.js"');
	// Typeless <script src> is upgraded to a module script.
	expect(page).toMatch(/<script type="module" src="__html_[^"]+\.chunk\.js">/);
	// An explicit type="module" stays a module script.
	const moduleScripts = page.match(/<script type="module" src=/g);
	expect(moduleScripts).toHaveLength(2);
	// The inline classic <script> body is replaced and the tag upgraded too.
	expect(page).toMatch(/<script type="module"[^>]*>[^<]*<\/script>/);
	// A non-JavaScript data block is left untouched (not a module script).
	expect(page).toMatch(/<script type="application\/ld\+json">/);
});
