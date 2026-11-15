it("should keep a page's tag out of an entry it names", () => {
	// The page's script asks for this entry's name; it gets no place in it.
	expect(globalThis.taggedByPage).toBeUndefined();
	expect(globalThis.taggedByOther).toBeUndefined();
});

it("should let pages share a chunk named for the same tag", () => {
	// Both pages name the same file, so they load one chunk and no error is
	// reported for it.
	const vendor = __STATS__.entrypoints.vendor;
	expect(vendor.assets.map((asset) => asset.name)).toEqual(["vendor.js"]);
	expect(__STATS__.errors.map((error) => error.message).join("\n")).not.toContain(
		'"vendor"'
	);
});
