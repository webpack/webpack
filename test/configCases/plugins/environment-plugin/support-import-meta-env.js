it("should support import.meta.env", () => {
	expect(process.env.MY_ENV).toBe("env1");
	expect(import.meta.env.MY_ENV).toBe("env1");
});
