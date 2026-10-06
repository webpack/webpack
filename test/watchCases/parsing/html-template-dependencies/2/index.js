import page from "./page.html";

it("should rebuild when a missing file the template watched appears", () => {
	expect(page).toContain('<p id="extra">from extra</p>');
	expect(page).toContain('<p id="partials">a.txt</p>');
});
