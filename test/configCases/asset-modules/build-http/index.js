const urlSvg = new URL(
	"https://raw.githubusercontent.com/webpack/webpack/refs/heads/main/test/configCases/asset-modules/_images/file.svg",
	import.meta.url
);

it("should work", () => {
	expect(/[\da-f]{20}\.svg$/.test(urlSvg)).toBe(true);
});
