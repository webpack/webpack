import page from "./page.html";

it("should rebuild when a directory the template watched gains a file", () => {
	expect(page).toContain("<title>two</title>");
	expect(page).toContain('<p id="partials">a.txt,b.txt</p>');
});
