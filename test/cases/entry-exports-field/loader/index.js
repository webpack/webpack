import d1 from "toml-parser!./file.txt";

it("should resolve loader using exports field", () => {
	expect(d1).toBe("123\ntoml");
});
