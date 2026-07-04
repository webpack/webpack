import page from "./page.html";

it("should rewrite svg-namespace fill/stroke urls but skip html elements", () => {
	expect(page).toMatchSnapshot();
});
