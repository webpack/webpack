import page from "./page.html";

it("should drop input tags when fragment context is select", () => {
	expect(page).toMatchSnapshot();
});
