import page from "./page.html";

it("should silently skip whitespace-only source attribute values", () => {
	expect(page).toMatchSnapshot();
});
