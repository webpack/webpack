"use strict";

function verifyLink(link, expectations) {
	expect(link._type).toBe("link");
	expect(link.rel).toBe(expectations.rel);

	if (expectations.as) {
		expect(link.as).toBe(expectations.as);
	}

	if (expectations.type !== undefined) {
		if (expectations.type) {
			expect(link.type).toBe(expectations.type);
		} else {
			expect(link.type).toBeUndefined();
		}
	}

	if (expectations.media !== undefined) {
		if (expectations.media) {
			expect(link.media).toBe(expectations.media);
		} else {
			expect(link.media).toBeUndefined();
		}
	}

	if (expectations.fetchPriority !== undefined) {
		if (expectations.fetchPriority) {
			expect(link._attributes.fetchpriority).toBe(expectations.fetchPriority);
			expect(link.fetchPriority).toBe(expectations.fetchPriority);
		} else {
			expect(link._attributes.fetchpriority).toBeUndefined();
			expect(link.fetchPriority).toBeUndefined();
		}
	}


	if (expectations.href) {
		expect(link.href.toString()).toMatch(expectations.href);
	}
}

it("should generate all prefetch and preload links", () => {
	const urls = {
		prefetchHigh: new URL(
			/* webpackPrefetch: true */ /* webpackFetchPriority: "high" */
			"./assets/images/priority-high.png",
			import.meta.url
		),
		preloadLow: new URL(
			/* webpackPreload: true */ /* webpackFetchPriority: "low" */
			"./assets/styles/priority-low.css",
			import.meta.url
		),
		prefetchAuto: new URL(
			/* webpackPrefetch: true */ /* webpackFetchPriority: "auto" */
			"./priority-auto.js",
			import.meta.url
		),
		bothHints: new URL(
			/* webpackPrefetch: true */ /* webpackPreload: true */ /* webpackFetchPriority: "high" */
			"./assets/images/both-hints.png",
			import.meta.url
		),
		noPriority: new URL(
			/* webpackPrefetch: true */
			"./assets/images/test.png",
			import.meta.url
		),
		preloadFont: new URL(
			/* webpackPreload: true */
			"./assets/fonts/test.woff2",
			import.meta.url
		)
	};

	const prefetchHighLink = document.head._children.find(
		link => link.href.includes("priority-high.png") && link.rel === "prefetch"
	);
	expect(prefetchHighLink).toBeTruthy();
	verifyLink(prefetchHighLink, {
		rel: "prefetch",
		as: "image",
		fetchPriority: "high",
		href: /priority-high\.png$/
	});

	const preloadLowLink = document.head._children.find(
		link => link.href.includes("priority-low.css") && link.rel === "preload"
	);
	expect(preloadLowLink).toBeTruthy();
	verifyLink(preloadLowLink, {
		rel: "preload",
		as: "style",
		fetchPriority: "low",
		href: /priority-low\.css$/
	});

	const prefetchAutoLink = document.head._children.find(
		link => link.href.includes("priority-auto.js") && link.rel === "prefetch"
	);
	expect(prefetchAutoLink).toBeTruthy();
	verifyLink(prefetchAutoLink, {
		rel: "prefetch",
		as: "script",
		fetchPriority: "auto"
	});

	const bothHintsLink = document.head._children.find(
		link => link.href.includes("both-hints.png")
	);
	expect(bothHintsLink).toBeTruthy();
	expect(bothHintsLink.rel).toBe("preload");
	expect(bothHintsLink._attributes.fetchpriority).toBe("high");

	const noPriorityLink = document.head._children.find(
		link => link.href.includes("test.png") && link.rel === "prefetch" &&
			!link._attributes.fetchpriority
	);
	expect(noPriorityLink).toBeTruthy();
	verifyLink(noPriorityLink, {
		rel: "prefetch",
		as: "image",
		fetchPriority: undefined
	});

	const fontPreloadLink = document.head._children.find(
		link => link.href.includes("test.woff2") && link.rel === "preload"
	);
	expect(fontPreloadLink).toBeTruthy();
	verifyLink(fontPreloadLink, {
		rel: "preload",
		as: "font",
		href: /test\.woff2$/
	});
});

it("should allow overriding as/type/media via magic comments", () => {
	const override = new URL(
		/* webpackPreload: true */
		/* webpackPreloadAs: "font" */
		/* webpackPreloadType: "font/woff2" */
		/* webpackPreloadMedia: "(max-width: 600px)" */
		"./assets/images/override.png",
		import.meta.url
	);

	const link = document.head._children.find(
		l => l.href.includes("override.png") && l.rel === "preload"
	);
	expect(link).toBeTruthy();
	verifyLink(link, {
		rel: "preload",
		as: "font",
		type: "font/woff2",
		media: "(max-width: 600px)",
		href: /override\.png$/
	});
});

it("should accept additional as tokens from Fetch Standard (e.g., sharedworker)", () => {
	const u = new URL(
		/* webpackPreload: true */
		/* webpackPreloadAs: "sharedworker" */
		"./priority-auto.js",
		import.meta.url
	);

	const link = document.head._children.find(
		l => l.href.includes("priority-auto.js") && l.rel === "preload"
	);
	expect(link).toBeTruthy();
	verifyLink(link, {
		rel: "preload",
		as: "sharedworker",
		href: /priority-auto\.js$/
	});
});
