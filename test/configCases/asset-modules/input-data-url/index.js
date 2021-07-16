it("should allow empty urls", () => {
	const url = new URL("data:,", import.meta.url);
	expect(url.href).toBe("data:,");
	expect(url.protocol).toBe("data:");
	expect(url.pathname).toBe(",");
});

it("should allow empty urls with mimetype", () => {
	const url = new URL("data:test,", import.meta.url);
	expect(url.href).toBe("data:test,");
	expect(url.protocol).toBe("data:");
	expect(url.pathname).toBe("test,");
});

it("should allow data urls with mimetype", () => {
	const url = new URL(
		"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MDAgNjAwIj48dGl0bGU+aWNvbi1zcXVhcmUtc21hbGw8L3RpdGxlPjxwYXRoIGZpbGw9IiNGRkYiIGQ9Ik0zMDAgLjFMNTY1IDE1MHYyOTkuOUwzMDAgNTk5LjggMzUgNDQ5LjlWMTUweiIvPjxwYXRoIGZpbGw9IiM4RUQ2RkIiIGQ9Ik01MTcuNyA0MzkuNUwzMDguOCA1NTcuOHYtOTJMNDM5IDM5NC4xbDc4LjcgNDUuNHptMTQuMy0xMi45VjE3OS40bC03Ni40IDQ0LjF2MTU5bDc2LjQgNDQuMXpNODEuNSA0MzkuNWwyMDguOSAxMTguMnYtOTJsLTEzMC4yLTcxLjYtNzguNyA0NS40em0tMTQuMy0xMi45VjE3OS40bDc2LjQgNDQuMXYxNTlsLTc2LjQgNDQuMXptOC45LTI2My4yTDI5MC40IDQyLjJ2ODlsLTEzNy4zIDc1LjUtMS4xLjYtNzUuOS00My45em00NDYuOSAwTDMwOC44IDQyLjJ2ODlMNDQ2IDIwNi44bDEuMS42IDc1LjktNDR6Ii8+PHBhdGggZmlsbD0iIzFDNzhDMCIgZD0iTTI5MC40IDQ0NC44TDE2MiAzNzQuMVYyMzQuMmwxMjguNCA3NC4xdjEzNi41em0xOC40IDBsMTI4LjQtNzAuNnYtMTQwbC0xMjguNCA3NC4xdjEzNi41ek0yOTkuNiAzMDN6bS0xMjktODVsMTI5LTcwLjlMNDI4LjUgMjE4bC0xMjguOSA3NC40LTEyOS03NC40eiIvPjwvc3ZnPgo=",
		import.meta.url
	);
	expect(url.protocol).toBe("data:");
	expect(url.href).toMatch(/^data:image\/svg\+xml;base64,/);
});

it("should allow data urls with mimetype mapped to rules", () => {
	const url = new URL(
		"data:image/svg+xml+external;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MDAgNjAwIj48dGl0bGU+aWNvbi1zcXVhcmUtc21hbGw8L3RpdGxlPjxwYXRoIGZpbGw9IiNGRkYiIGQ9Ik0zMDAgLjFMNTY1IDE1MHYyOTkuOUwzMDAgNTk5LjggMzUgNDQ5LjlWMTUweiIvPjxwYXRoIGZpbGw9IiM4RUQ2RkIiIGQ9Ik01MTcuNyA0MzkuNUwzMDguOCA1NTcuOHYtOTJMNDM5IDM5NC4xbDc4LjcgNDUuNHptMTQuMy0xMi45VjE3OS40bC03Ni40IDQ0LjF2MTU5bDc2LjQgNDQuMXpNODEuNSA0MzkuNWwyMDguOSAxMTguMnYtOTJsLTEzMC4yLTcxLjYtNzguNyA0NS40em0tMTQuMy0xMi45VjE3OS40bDc2LjQgNDQuMXYxNTlsLTc2LjQgNDQuMXptOC45LTI2My4yTDI5MC40IDQyLjJ2ODlsLTEzNy4zIDc1LjUtMS4xLjYtNzUuOS00My45em00NDYuOSAwTDMwOC44IDQyLjJ2ODlMNDQ2IDIwNi44bDEuMS42IDc1LjktNDR6Ii8+PHBhdGggZmlsbD0iIzFDNzhDMCIgZD0iTTI5MC40IDQ0NC44TDE2MiAzNzQuMVYyMzQuMmwxMjguNCA3NC4xdjEzNi41em0xOC40IDBsMTI4LjQtNzAuNnYtMTQwbC0xMjguNCA3NC4xdjEzNi41ek0yOTkuNiAzMDN6bS0xMjktODVsMTI5LTcwLjlMNDI4LjUgMjE4bC0xMjguOSA3NC40LTEyOS03NC40eiIvPjwvc3ZnPgo=",
		import.meta.url
	);
	expect(url.href).toMatch(/^https:\/\/test\.cases\/path\/[a-f0-9]+\.svg$/);
});
