import page from "./page.html";

it("should handle source", () => {
	expect(page).toMatchSnapshot();
});
