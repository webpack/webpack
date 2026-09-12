import url from "./icon.svg";

it("should emit an icon whose presentation attributes read as css values", () => {
	expect(url).toMatch(/icon\.svg$/);
});
