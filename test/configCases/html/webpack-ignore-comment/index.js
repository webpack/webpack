import page from "./page.html";

it("should handle webpackIgnore comments on img src attributes", () => {
	expect(page).toMatchSnapshot();
});
