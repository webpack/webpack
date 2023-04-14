it("should load the component from container", async () => {
	await __webpack_init_sharing__("test-scope");

	// 2 scopes for "0-container-full-mjs" & "mf-with-shareScope-mjs"
	expect(Object.keys(__webpack_share_scopes__["test-scope"].react).length).toBe(2);

	return import("./App").then(({ default: App }) => {
		const rendered = App();
		expect(rendered).toBe(
			"App rendered with [This is react 2.1.0] and [ComponentA rendered with [This is react 2.1.0]] and [ComponentB rendered with [This is react 2.1.0]]"
		);
		return import("./upgrade-react").then(({ default: upgrade }) => {
			upgrade();
			const rendered = App();
			expect(rendered).toBe(
				"App rendered with [This is react 3.2.1] and [ComponentA rendered with [This is react 3.2.1]] and [ComponentB rendered with [This is react 3.2.1]]"
			);
		});
	});
});
