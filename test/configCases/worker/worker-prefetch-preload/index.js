"use strict";

it("should emit prefetch <link> when webpackPrefetch is inside the inner new URL", () => {
	// eslint-disable-next-line no-new
	new Worker(
		new URL(/* webpackPrefetch: true */ "./prefetch.worker.js", import.meta.url)
	);

	const link = document.head._children.find(
		(el) =>
			el._type === "link" &&
			el.rel === "prefetch" &&
			String(el.href).includes("prefetch_worker_js")
	);
	expect(link).toBeDefined();
	expect(link.as).toBe("script");
});

it("should emit preload <link> when webpackPreload is inside the inner new URL", () => {
	// eslint-disable-next-line no-new
	new Worker(
		new URL(/* webpackPreload: true */ "./preload.worker.js", import.meta.url)
	);

	const link = document.head._children.find(
		(el) =>
			el._type === "link" &&
			el.rel === "preload" &&
			String(el.href).includes("preload_worker_js")
	);
	expect(link).toBeDefined();
	expect(link.as).toBe("script");
});

it("should ignore resource-hint comments placed outside the inner new URL", () => {
	// eslint-disable-next-line no-new
	new Worker(
		/* webpackPreload: true */
		new URL("./ignored.worker.js", import.meta.url)
	);

	const link = document.head._children.find(
		(el) =>
			el._type === "link" && String(el.href).includes("ignored_worker_js")
	);
	expect(link).toBeUndefined();
});
