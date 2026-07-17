it("should fall back import.meta.env.BASE_URL to '/' for a function publicPath", () => {
	// the function runs at runtime, so there is no static base to expose
	expect(import.meta.env.BASE_URL).toBe("/");
	expect(__webpack_public_path__).toBe("/from-fn/");
	expect(import.meta.env.MODE).toBe("production");
	expect(import.meta.env.SSR).toBe(false);
});
