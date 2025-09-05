// Test cases for new URL() prefetch/preload support

it("should prefetch an image asset", () => {
	const url = new URL(
		/* webpackPrefetch: true */ 
		"./prefetch-image.png",
		import.meta.url
	);
	expect(url.href).toMatch(/prefetch-image\.png$/);
});

it("should preload an image asset", () => {
	const url = new URL(
		/* webpackPreload: true */
		"./preload-image.png",
		import.meta.url
	);
	expect(url.href).toMatch(/preload-image\.png$/);
});

it("should preload with fetch priority", () => {
	const url = new URL(
		/* webpackPreload: true */
		/* webpackFetchPriority: "high" */
		"./priority-image.png",
		import.meta.url
	);
	expect(url.href).toMatch(/priority-image\.png$/);
});

it("should handle invalid fetch priority", () => {
	const url2 = new URL(
		/* webpackPreload: true */
		/* webpackFetchPriority: "invalid" */
		"./invalid-priority-image.png",
		import.meta.url
	);
	expect(url2.href).toMatch(/invalid-priority-image\.png$/);
});

it("should handle both prefetch and preload", () => {
	const url3 = new URL(
		/* webpackPrefetch: true */
		/* webpackPreload: true */
		"./both-hints-image.png",
		import.meta.url
	);
	expect(url3.href).toMatch(/both-hints-image\.png$/);
});