import page from "./page.html";

it("should resolve url() references in SVG presentation attributes", () => {
	expect(page).not.toContain("./paint.svg");
	// Unquoted and quoted url() in fill/stroke/filter/mask are rewritten
	expect(page).toMatch(/fill="url\([0-9a-f]+\.svg#grad\)"/);
	expect(page).toMatch(/stroke="url\('[0-9a-f]+\.svg#grad'\)"/);
	expect(page).toMatch(/filter="url\([0-9a-f]+\.svg#blur\)"/);
	expect(page).toMatch(/mask="url\([0-9a-f]+\.svg#m\)"/);
	// Internal FuncIRI references stay untouched
	expect(page).toContain('clip-path="url(#clip)"');
	// Values with no url(), no value or an empty url() are left alone
	expect(page).toContain('<rect fill="red" stroke mask="url()"/>');
	// The url() is read decoded, so an entity in it reaches the request
	expect(page).toMatch(/marker="url\([0-9a-f]+\.svg\?a&b#z\)"/);
	expect(page).toMatchSnapshot();
});
