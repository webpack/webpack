import page from "./page.html";

it("style-tag-body: should hand the CSS pipeline the whole <style> body, across an HTML comment", () => {
	expect(page).toContain(".first");
	expect(page).toContain(".second");
	expect(page).toMatchSnapshot();
});

it("style-tag-body: should leave an empty or whitespace-only <style> out of the CSS pipeline", () => {
	expect(page).toContain("<style></style>");
	expect(page).toContain("<style>   </style>");
	// Only the first sheet is a module, so only it gets a source header.
	expect((page.match(/css data:text\/css;base64,/g) || []).length).toBe(1);
});
