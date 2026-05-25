import page from "./page.html";

it("should emit `type=module` <script> siblings for a custom `script` source under output.module", () => {
	// The custom element's own `src` is rewritten in place to its entry chunk.
	expect(page).toMatch(/<my-script src="__html_[a-f0-9]+_\d+\.chunk\.js">/);
	// The split-out runtime chunk is ESM (output.module), so its synthesized
	// sibling must carry `type="module"` — a classic <script> couldn't load it.
	expect(page).toMatch(
		/<script type="module" src="[^"]*-runtime\.js"><\/script>/
	);
	// No classic (non-module) runtime sibling, and no cloned custom element.
	expect(page).not.toMatch(/<script src="[^"]*-runtime\.js"><\/script>/);
	expect((page.match(/<my-script\b/g) || []).length).toBe(1);
	expect(page).not.toMatch(/<my-script[^>]*><\/script>/);
});
