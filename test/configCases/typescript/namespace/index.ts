namespace Test {
	export const x = 1;
}

const result = Test.x;

it("should work", () => {
	expect(result).toBe(1);
});
