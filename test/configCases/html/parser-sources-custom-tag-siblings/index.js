import page from "./page.html";

it("should emit a real classic <script> sibling (not a cloned custom element) for a `script` source with runtimeChunk", () => {
	// The custom element's own `src` is rewritten in place to its entry chunk.
	expect(page).toMatch(/<my-script src="__html_[a-f0-9]+_\d+\.chunk\.js">/);
	// The split-out runtime chunk is loaded by a *real* classic <script>
	// inserted before the custom element — never a clone of <my-script>.
	expect(page).toMatch(/<script src="[^"]*-runtime\.js"><\/script>/);
	// Exactly one <my-script> tag survives (the original). A cloned sibling
	// would show up as the `<my-script …></script>` bug.
	expect((page.match(/<my-script\b/g) || []).length).toBe(1);
	expect(page).not.toMatch(/<my-script[^>]*><\/script>/);
});

it("should emit a real `type=module` <script> sibling for a `script-module` source", () => {
	expect(page).toMatch(/<my-module src="__html_[a-f0-9]+_\d+\.chunk\.js">/);
	expect(page).toMatch(
		/<script type="module" src="[^"]*-runtime\.js"><\/script>/
	);
	expect((page.match(/<my-module\b/g) || []).length).toBe(1);
	expect(page).not.toMatch(/<my-module[^>]*><\/script>/);
});
