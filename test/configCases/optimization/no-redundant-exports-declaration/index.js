// Entry with no exports - __webpack_exports__ is only ever the initial empty object (issue #20146)
global.__entryRan__ = true;
it("should have run the entry", () => {
	expect(global.__entryRan__).toBe(true);
});
