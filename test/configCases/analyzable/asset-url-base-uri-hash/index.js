export const url = new URL("./asset.txt", import.meta.url);

it("should resolve the asset", () => {
	expect(String(url)).toContain("asset.txt");
});
