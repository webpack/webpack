import page from "./page.html";

it("should handle webpackIgnore comments on img src attributes", () => {
	// webpackIgnore: true → src left as-is
	expect(page).toContain('<img src="./image.png" alt="a">');
	// non-boolean and malformed comment → warning emitted, src still rewritten
	expect(page).toMatch(/<img src="[a-f0-9]+\.png" alt="b">/);
	expect(page).toMatch(/<img src="[a-f0-9]+\.png" alt="c">/);
	expect(page).toMatch(/<img src="[a-f0-9]+\.png" alt="d">/);
	expect(page).toMatchSnapshot();
});
