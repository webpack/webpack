import img from "./image.png";

it("should resolve public path automatically in universal target", () => {
	expect(img).toMatch(/^(https?|file):\/\//);
	expect(img).toMatch(/[a-f0-9]+\.png$/);
	expect(img.startsWith(__webpack_public_path__)).toBe(true);
});

it("should resolve the asset URL as publicPath + hashed filename on both web and node", () => {
	// universal ESM has no document/location, so the same import.meta.url base is
	// used under web and node; the asset URL is just the public path + file name.
	expect(img).toBe(`${__webpack_public_path__}${img.slice(__webpack_public_path__.length)}`);
	expect(img.slice(__webpack_public_path__.length)).toMatch(/^[a-f0-9]+\.png$/);
});

it("should resolve assets from a dynamically imported chunk under universal", async () => {
	const { default: asyncImg } = await import("./async.js");
	expect(asyncImg).toMatch(/^(https?|file):\/\//);
	expect(asyncImg.startsWith(__webpack_public_path__)).toBe(true);
});

it("should have correct __webpack_public_path__", () => {
	expect(__webpack_public_path__).toMatch(/^(https?|file):\/\//);
});
