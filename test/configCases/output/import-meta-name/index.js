import { url } from "./a";

it("should evaluate import.meta to pseudoImport.meta", () => {
	expect(url).toBe("http://test.co/path/index.js");
});

it("should evaluate import.meta in runtime", () => {
	expect(url).toBe(import.meta.url);
});
