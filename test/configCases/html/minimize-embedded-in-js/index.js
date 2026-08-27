import page from "./page.html";

it("should minify HTML a module embeds in a JavaScript string literal", () => {
	// The comment is gone, the attribute needs no quotes, and the `style=""` the
	// document nests reached the CSS minifier.
	expect(page).toContain("<div class=a>");
	expect(page).toContain("<p style=color:red>hello</p>");
	expect(page).not.toContain("dropped");
});
