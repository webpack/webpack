import url from "./file.png";

it("should mark asset modules as side-effect-free via AssetModule", () => {
	expect(url).toMatch(/\.png$/);
});
