import page from "./page.html";

it("adoption-agency-table: should handle formatting elements misnested inside table context", () => {
	expect(page).toMatchSnapshot();
});
