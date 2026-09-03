import url from "./icon.svg";

it("should emit the icon a plugin already claims", () => {
	expect(url).toMatch(/icon\.svg$/);
});
