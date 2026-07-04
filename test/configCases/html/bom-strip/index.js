import page from "./page.html";

it("should strip a UTF-8 BOM from the HTML source", () => {
	expect(page).toMatchSnapshot();
});
