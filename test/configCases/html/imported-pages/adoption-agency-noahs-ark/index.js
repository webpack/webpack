import page from "./page.html";

it("adoption-agency-noahs-ark: should handle the noahs ark condition in the adoption agency algorithm", () => {
	expect(page).toMatchSnapshot();
});
