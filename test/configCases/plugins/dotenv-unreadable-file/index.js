it("should report a dotenv file that cannot be read", () => {
	expect(import.meta.env.WEBPACK_FROM_UNREADABLE).toBe(undefined);
});
