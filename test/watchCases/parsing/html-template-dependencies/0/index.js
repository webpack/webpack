import page from "./page.html";

it("should render what the template read", () => {
	expect(page).toContain("<title>one</title>");
	expect(page).toContain('<p id="extra">none</p>');
	expect(page).toContain('<p id="partials">a.txt</p>');
});
