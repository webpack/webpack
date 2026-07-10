it("should not treat addModule as a worklet when the option is disabled", async () => {
	let workletURL;

	const context = {
		audioWorklet: {
			addModule(url) {
				workletURL = url.toString();
				return Promise.resolve();
			}
		}
	};

	await context.audioWorklet.addModule(new URL("./worklet.js", import.meta.url));

	// left untouched -> resolved as an asset module URL
	expect(workletURL).toMatch(/asset-/);
});
