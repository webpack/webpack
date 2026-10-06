import page from "./page.html";

it("should rebuild when a file the template added changes", () => {
	expect(page).toContain("<title>two</title>");
	expect(page).toContain('<p id="extra">none</p>');
});
