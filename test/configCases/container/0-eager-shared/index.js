it("should allow to import exposed modules sync", () => {
	return import("./App").then(({ default: App }) => {
		expect(App().e.hello).toBeDefined();
	});
});

