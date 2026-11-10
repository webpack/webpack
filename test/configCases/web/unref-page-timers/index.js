it("should not let a page's timer keep the process alive", () => {
	const timer = setTimeout(() => {}, 120000);
	try {
		// Deno's setTimeout returns a number, and Node.js 10 has no `hasRef`
		if (typeof timer === "object" && typeof timer.hasRef === "function") {
			expect(timer.hasRef()).toBe(false);
		}
	} finally {
		clearTimeout(timer);
	}
});
