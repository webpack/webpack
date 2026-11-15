if (Math.random() < 0) require("./x");

it("should run an entry whose modules another chunk also holds", () => {
	expect(self.flagIncludedEntryRan).toBe(true);
});
