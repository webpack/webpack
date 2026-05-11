import page from "./page.html";

it("should support webpackIgnore magic comment in html modules", () => {
	expect(typeof page).toBe("string");
	// Resolved URLs are rewritten to a hashed asset filename without the
	// leading "./".
	expect(page).toMatch(/<img src="[a-f0-9]+\.png" alt="resolved">/);
	expect(page).toMatch(
		/<img src="[a-f0-9]+\.png" alt="resolved-explicit-false">/
	);
	expect(page).toMatch(/<img src="[a-f0-9]+\.png" alt="overridden">/);
	// Nested img inside an ignored parent must still be processed.
	expect(page).toMatch(
		/<img src="[a-f0-9]+\.png" alt="nested-not-ignored">/
	);
	// Ignored URLs remain unchanged in the output.
	expect(page).toContain('<img src="./ignored.png" alt="ignored">');
	expect(page).toContain(
		'<img src="./still-ignored.png" srcset="./still-ignored.png 2x" alt="ignored-with-srcset">'
	);
	expect(page).toContain(
		'<img src="./still-ignored2.png" alt="ignored-last-wins">'
	);
	// Non-boolean webpackIgnore should not ignore; original src is replaced.
	expect(page).toMatch(
		/<img src="[a-f0-9]+\.png" alt="warning-non-boolean">/
	);
	expect(page).toMatchSnapshot();
});
