it("should expose Vite-compatible defaults for a development web build", () => {
	expect(import.meta.env.NODE_ENV).toBe("development");
	expect(import.meta.env.MODE).toBe("development");
	expect(import.meta.env.DEV).toBe(true);
	expect(import.meta.env.PROD).toBe(false);
	// web target is not a server build
	expect(import.meta.env.SSR).toBe(false);
});

it("should default import.meta.env.BASE_URL to '/' when publicPath is 'auto'", () => {
	expect(import.meta.env.BASE_URL).toBe("/");
});
