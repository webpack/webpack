import page from "./page.html";

it("skip-behavior: should silently skip whitespace-only source attribute values", () => {
	expect(page).toMatchSnapshot();
});
