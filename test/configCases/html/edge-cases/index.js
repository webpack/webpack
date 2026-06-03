import page from "./page.html";

it("should skip non-resolvable URLs and match tags case-insensitively", () => {
	expect(page).toMatchSnapshot();
});
