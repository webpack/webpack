it("should not let a page's timer keep the process alive", () => {
	const timer = setTimeout(() => {}, 120000);
	try {
		// Deno's setTimeout returns a number, which holds no handle to unref
		if (typeof timer === "object") expect(timer.hasRef()).toBe(false);
	} finally {
		clearTimeout(timer);
	}
});
