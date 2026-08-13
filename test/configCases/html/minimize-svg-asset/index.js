import url from "./icon.svg";

it("should emit an icon no HTML shorthand has made invalid XML", () => {
	expect(url).toMatch(/icon\.svg$/);
});
