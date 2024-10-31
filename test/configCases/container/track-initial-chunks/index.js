it("should have the hoisted container references", async () => {
	const before = __webpack_modules__;
	debugger;

	// Initialize tracker array
	const tracker = [];

	// Call the consumes function to populate tracker with hoisted container references
	__webpack_require__.f.consumes("other", tracker);

	// Ensure all references in tracker are resolved
	await Promise.all(tracker);

	const after = __webpack_modules__;
	debugger;

	// Verify that tracker contains hoisted container references
	expect(tracker).not.toHaveLength(0);
});

it("should load the component from container", () => {
	return import("./App").then(({ default: App }) => {
		const rendered = App();
		expect(rendered).toBe(
			"App rendered with [This is react 0.1.2] and [ComponentA rendered with [This is react 0.1.2]]"
		);
		return import("./upgrade-react").then(({ default: upgrade }) => {
			upgrade();
			const rendered = App();
			expect(rendered).toBe(
				"App rendered with [This is react 1.2.3] and [ComponentA rendered with [This is react 1.2.3]]"
			);
		});
	});
});
