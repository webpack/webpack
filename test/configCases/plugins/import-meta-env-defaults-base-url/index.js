it("should derive import.meta.env.BASE_URL from a static output.publicPath", () => {
	expect(import.meta.env.BASE_URL).toBe("/cdn/");
	// web target is not a server build
	expect(import.meta.env.SSR).toBe(false);
	expect(import.meta.env.MODE).toBe("production");
	expect(import.meta.env.PROD).toBe(true);
});
