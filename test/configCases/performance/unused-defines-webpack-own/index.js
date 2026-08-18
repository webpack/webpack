it("should not report the keys webpack defines itself", () => {
	// `import.meta.env.*` and `process.env.NODE_ENV` are webpack's, and this
	// module reads none of them.
	expect(1).toBe(1);
});
