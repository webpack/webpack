import page from "./page.html";

it("should ignore input tags when fragment context is select", () => {
	expect(page).toMatchSnapshot();
});
