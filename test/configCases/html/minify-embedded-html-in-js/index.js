import page from "./page.html";

it("should minify HTML embedded in JS", () => {
	expect(page).toMatchSnapshot();
});
