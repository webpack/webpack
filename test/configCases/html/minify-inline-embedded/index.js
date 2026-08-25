import page from "./page.html";

it("should route what the document embeds through the caller's renderer", () => {
	expect(page).toMatchSnapshot();
});
