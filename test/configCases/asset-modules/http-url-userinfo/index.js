it("should reject a URL whose userinfo repeats an allowed host", () => {
	expect(() =>
		require("http://localhost:9992@127.0.0.1:9992/resolve.js")
	).toThrow();
});

it("should reject a redirect to a URL with userinfo", () => {
	expect(() =>
		require("http://localhost:9992/resolve.js?redirect-userinfo")
	).toThrow();
});

it("should send credentials from an allowed URL", () => {
	expect(
		require("http://user:tok@localhost:9992/resolve.js?auth").value
	).toBe(42);
});
