it("Should eliminate hoisted function in ESM because of default strict mode", () => {
	expect(() => {
		fnDecl;
	}).toThrow();
	try {
		throw new Error();
	} catch (e) {
		return;
	}
	{
		function fnDecl() {
			expect(true).toBe(true);
		}
	}
	expect(true).toBe(false);
});

export default "esm1";
