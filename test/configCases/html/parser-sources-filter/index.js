import page from "./page.html";

it("should apply sources[].filter to conditionally extract URLs", () => {
	expect(page).toMatchSnapshot();
});
