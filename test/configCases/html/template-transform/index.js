import page from "./page.html";

it("should apply template transform and surface warnings/errors", () => {
	expect(page).toMatchSnapshot();
});
