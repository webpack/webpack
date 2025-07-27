"use strict";

function verifyLink(link, expectations) {
	expect(link._type).toBe("link");
	expect(link.rel).toBe(expectations.rel);
	
	if (expectations.as) {
		expect(link.as).toBe(expectations.as);
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
	
	if (expectations.type) {
		expect(link.type).toBe(expectations.type);
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
		preloadTyped: new URL(
			/* webpackPreload: true */ /* webpackPreloadType: "text/css" */
			"./assets/styles/typed.css",
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
	
	const preloadTypedLink = document.head._children.find(
		link => link.href.includes("typed.css") && link.rel === "preload"
	);
	expect(preloadTypedLink).toBeTruthy();
	verifyLink(preloadTypedLink, {
		rel: "preload",
		as: "style",
		type: "text/css",
		href: /typed\.css$/
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

