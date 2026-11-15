// a top-level binding the inner graph tags, so the parser sees it as defined;
// not a constant, so no plugin evaluates it before `evaluateDefinedIdentifier`
export const flag = Math.max(1, 0);

it("should evaluate a defined identifier through evaluateDefinedIdentifier", () => {
	let reached = false;
	// the plugin's tap evaluates `flag` to false, which drops this branch
	if (flag) {
		reached = true;
	}
	expect(reached).toBe(false);
	expect(flag).toBe(1);
});
