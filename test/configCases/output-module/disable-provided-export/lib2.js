export const _default = 'disable-provided-export'

export default "null"

it("should compile and run", () => {
	// avoid `No tests exported by test case`
	expect(true).toBe(true)
});