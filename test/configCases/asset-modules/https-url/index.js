import codeOfConduct from "https://raw.githubusercontent.com/webpack/webpack/main/CODE_OF_CONDUCT.md";

it("https url request should be supported", () => {
	expect(codeOfConduct.includes("CODE_OF_CONDUCT")).toBeTruthy();
});
