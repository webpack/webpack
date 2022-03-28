it("should compile and run", () => {
	expect(hello()).toBe("hello");
});

export function hello() { return "hello"; }
