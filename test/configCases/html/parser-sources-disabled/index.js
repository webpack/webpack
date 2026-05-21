import page from "./page.html";

it("should leave URL attributes untouched when module.parser.html.sources is false", () => {
	// None of the referenced files (./entry.js, ./styles.css, ./icon.png,
	// ./image.png) exist in this directory — disabling `sources` means
	// the parser must not turn them into webpack dependencies, otherwise
	// the compilation would fail with module-not-found errors.
	expect(page).toContain('href="./icon.png"');
	expect(page).toContain('href="./styles.css"');
	expect(page).toContain('src="./entry.js"');
	expect(page).toContain('src="./image.png"');
});

it("should still bundle inline <script> bodies when sources is false", () => {
	// `sources` controls URL-attribute extraction only; inline script
	// bodies are not URLs and remain processed — the body becomes its
	// own chunk and the tag is rewritten to `<script src=…>`.
	expect(page).toMatch(/<script src="[^"]+\.js"><\/script>/);
	expect(page).not.toContain("__inlineSourcesDisabled");
});
