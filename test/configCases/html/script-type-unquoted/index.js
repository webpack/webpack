import page from "./page.html";

it("should strip an unquoted or single-quoted type=module attr when output.module is false", () => {
	expect(page).not.toContain("type=module");
	expect(page).not.toContain('type="module"');
	expect(page).not.toContain("type='module'");
	expect(page).toMatch(/<script src="[^"]+\.js"><\/script>/);
	expect(page).toMatchSnapshot();
});
