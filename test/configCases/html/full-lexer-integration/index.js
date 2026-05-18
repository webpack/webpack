import page from "./page.html";

it("should compile a kitchen-sink HTML document through all lexer states", () => {
	expect(typeof page).toBe("string");
	expect(page).toMatchSnapshot();
});
