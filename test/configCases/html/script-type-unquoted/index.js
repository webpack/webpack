import page from "./page.html";

it("should strip unquoted type=module attr when output.module is false", () => {
	expect(page).toMatchSnapshot();
});
