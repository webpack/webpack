import img from "./image.png";

it("should resolve public path automatically in universal target", () => {
    expect(img).toMatch(/^(https?|file):\/\//);
    expect(img).toMatch(/[a-f0-9]+\.png$/);
    expect(img.startsWith(__webpack_public_path__)).toBe(true);
});

it("should have correct __webpack_public_path__", () => {
    expect(__webpack_public_path__).toMatch(/^(https?|file):\/\//);
});
