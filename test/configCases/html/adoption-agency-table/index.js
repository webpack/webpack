import page from "./page.html";

it("should handle formatting elements misnested inside table context", () => {
	expect(page).toMatchSnapshot();
});
