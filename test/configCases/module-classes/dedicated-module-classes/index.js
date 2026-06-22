import data from "./data.json";
import auto from "./file.md";
import inlined from "./file.svg";
import url from "./file.png";
import source from "./file.txt";

it("should create dedicated module classes per module type", () => {
	expect(data.ok).toBe(true);
	expect(auto).toMatch(/^data:/);
	expect(inlined).toMatch(/^data:image\/svg/);
	expect(url).toMatch(/\.png$/);
	expect(source.trim()).toBe("source");
});
