import text from "./text.txt";
import bytes from "./data.bin";
import inline from "./icon.svg?inline";
import resource from "./icon.svg?resource";

it("should give each asset type only the `module.generator.asset` options it takes", () => {
	// the file is checked out with CRLF line endings on Windows
	expect(text.trim()).toBe("hello");
	expect(Array.from(bytes)).toEqual([120, 121]);
	expect(inline).toMatch(/^data:image\/svg\+xml;base64,/);
	expect(resource).toMatch(/assets\/icon\.svg$/);
});
