import content from "./loader!!";

it("should compile", () => {
	expect(typeof content).toBe("string");
	expect(content.startsWith("webpack://")).toBe(true);
});
