import page from "./page.html";

it("should leave URL attributes untouched when module.parser.html.sources is false", () => {
	// None of the referenced files exist here: disabling `sources` means the parser
	// must not turn them into webpack dependencies, or the compilation fails with
	// module-not-found errors.
	expect(page).toContain('href="./icon.png"');
	expect(page).toContain('href="./styles.css"');
	expect(page).toContain('src="./entry.js"');
	expect(page).toContain('src="./image.png"');
});

it("should not let Object.prototype-named tags bypass sources:false", () => {
	// `<constructor name="./proto-bypass.js">` must stay untouched — the lookup tables
	// are null-prototype, so `constructor` resolves to no inherited value and never
	// becomes a chunk entry for a file that does not exist.
	expect(page).toContain('name="./proto-bypass.js"');
	expect(page).not.toMatch(/name="page\d*\.js"/);
});

it("should still bundle inline <script> bodies when sources is false", () => {
	// `sources` controls URL-attribute extraction only; inline script
	// bodies are not URLs and remain processed — the body becomes its
	// own chunk and the tag is rewritten to `<script src=…>`.
	expect(page).toMatch(/<script src="[^"]+\.js"><\/script>/);
	expect(page).not.toContain("__inlineSourcesDisabled");
});
