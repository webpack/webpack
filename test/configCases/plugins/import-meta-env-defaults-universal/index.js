it("should not mark a universal (web+node) target as an SSR build", () => {
	// a universal bundle runs in both environments, so it must not claim to be server-only
	expect(import.meta.env.SSR).toBe(false);
	expect(import.meta.env.MODE).toBe("production");
	expect(import.meta.env.DEV).toBe(false);
	expect(import.meta.env.PROD).toBe(true);
	expect(import.meta.env.BASE_URL).toBe("/");
});
