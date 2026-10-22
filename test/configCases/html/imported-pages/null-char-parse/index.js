import page from "./page.html";

it("null-char-parse: should compile HTML containing null characters", () => {
	expect(page).toMatchSnapshot();
});
