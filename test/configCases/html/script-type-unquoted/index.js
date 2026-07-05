import page from "./page.html";

it("should strip unquoted type=module attr when output.module is false", () => {
	expect(page).not.toContain("type=module");
	expect(page).not.toContain('type="module"');
	expect(page).toMatch(/<script src="[^"]+\.mjs"><\/script>/);
	expect(page).toMatchSnapshot();
});
