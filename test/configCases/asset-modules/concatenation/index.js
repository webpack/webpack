import svgSource from "../_images/file.svg";
import jpgInline from "../_images/file.jpg";
import pngUrl from "../_images/file.png";
import textBytes from "./file.text";

it("should concatenate asset/source modules", () => {
	expect(typeof svgSource).toBe("string");
	expect(svgSource).toMatch(/^<svg[\s\S]*<\/svg>\s*$/);
});

it("should concatenate asset/inline modules", () => {
	expect(typeof jpgInline).toBe("string");
	expect(jpgInline).toMatch(/^data:image\/jpeg;base64,/);
});

it("should concatenate asset/resource modules", () => {
	expect(typeof pngUrl).toBe("string");
	expect(pngUrl).toMatch(/[\da-f]+\.png$/);
});

it("should concatenate asset/bytes modules", () => {
	expect(textBytes).toBeInstanceOf(Uint8Array);
	const decoded = new TextDecoder("utf-8").decode(textBytes);
	expect(decoded).toBe("a Ā 𐀀 文 🦄 Text\n");
});

it("should fold every asset module into a single concatenated module", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	// index.js + 4 asset modules = 5
	expect(concatModules[0].modules.length).toBeGreaterThanOrEqual(5);
});
