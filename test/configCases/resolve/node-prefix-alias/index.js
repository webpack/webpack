it("should ignore node: prefixed request via resolve.alias", () => {
	// node:fs is aliased to false, so this import should be ignored
	const fs = require("node:fs");
	// An ignored module has no exports, equivalent to module with no exports
	expect(fs).toEqual({});
});
