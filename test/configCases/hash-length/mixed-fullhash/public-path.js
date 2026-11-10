import url from "./asset.txt";

it("resolves a public path mixing a runtime and an inlined [fullhash]", () => {
	const { hash } = __STATS__.children[__INDEX__];
	// With the default `hex` digest the inlined form spells the same hash.
	expect(url).toBe(`/cdn/${hash.slice(0, 8)}/${hash.slice(0, 12)}/asset.txt`);
});
