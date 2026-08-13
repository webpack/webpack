import "./style.css";

const freeAsset = new URL("free-asset", import.meta.url);

it("should keep a side-effect-free asset external, its url is used", () => {
	expect(freeAsset.toString()).toBe("https://example.test/free-asset.png");
});
