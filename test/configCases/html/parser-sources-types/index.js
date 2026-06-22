import page from "./page.html";

it("should bundle a `script`-typed attribute as a classic chunk entry", () => {
	// `./classic.js` was bundled into a chunk; the original `<my-script
	// src="./classic.js">` was rewritten to point at it.
	expect(page).not.toContain('src="./classic.js"');
	expect(page).toMatch(/<my-script src="__html_[a-f0-9]+_\d+\.chunk\.js">/);
});

it("should bundle a `script-module`-typed attribute as an ESM chunk entry", () => {
	expect(page).not.toContain('src="./esm.js"');
	expect(page).toMatch(/<my-module src="__html_[a-f0-9]+_\d+\.chunk\.js">/);
});

it("should bundle a `stylesheet`-typed attribute as a CSS chunk entry", () => {
	// `./styles.css` flowed through the CSS pipeline; the custom tag's
	// `href` now points at the emitted `.css` chunk, not the source.
	expect(page).not.toContain('href="./styles.css"');
	expect(page).toMatch(/<my-link href="__html_[a-f0-9]+_\d+\.chunk\.css">/);
});

it("should bundle a `stylesheet-style`-typed attribute value as inline CSS", () => {
	// The attribute's value (a full stylesheet) was routed through the CSS
	// pipeline, so the rewritten value now carries the pipeline's banner
	// header alongside the original CSS text.
	expect(page).toMatch(
		/<my-style data-css="\/\*![\s\S]*?css data:text\/css[\s\S]*?body \{ color: red; \}\s*"><\/my-style>/
	);
});

it("should bundle a `stylesheet-style-attribute`-typed value as a block's contents", () => {
	// A bare declaration list is valid as a block's contents but a parse
	// error as a stylesheet; routed through the CSS pipeline it survives,
	// proving the value was parsed as `as: "block-contents"`.
	expect(page).toMatch(
		/<my-box data-style="[\s\S]*?color: ?green[\s\S]*?padding: ?10px[\s\S]*?"><\/my-box>/
	);
});
