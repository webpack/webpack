// The lockfile still contains git merge conflict markers; webpack must parse it
// by merging both sides instead of throwing, so the cached URL still resolves.
const urlSvg = new URL(
	"https://raw.githubusercontent.com/webpack/webpack/refs/heads/main/test/configCases/asset-modules/_images/file.svg",
	import.meta.url
);

it("should build from a lockfile that has unresolved merge conflicts", () => {
	expect(/[\da-f]{20}\.svg$/.test(urlSvg)).toBe(true);
});
