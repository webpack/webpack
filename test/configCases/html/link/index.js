import page from "./page.html";

it("should handle link tag", () => {
	expect(page).toMatchSnapshot();
});
