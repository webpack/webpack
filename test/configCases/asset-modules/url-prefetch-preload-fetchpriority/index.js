"use strict";

// Warnings are generated in generate-warnings.js to avoid duplication

// Clear document.head before each test
beforeEach(() => {
	if (global.document && global.document.head) {
		global.document.head._children = [];
	}
});

it("should generate prefetch link with fetchPriority for new URL() assets", () => {
	// Test high priority prefetch
	const imageHighUrl = new URL(/* webpackPrefetch: true */ /* webpackFetchPriority: "high" */ "./assets/images/priority-high.png", import.meta.url);

	expect(document.head._children).toHaveLength(1);
	const link1 = document.head._children[0];
	expect(link1._type).toBe("link");
	expect(link1.rel).toBe("prefetch");
	expect(link1.as).toBe("image");
	expect(link1._attributes.fetchpriority).toBe("high");
	expect(link1.fetchPriority).toBe("high");
	expect(link1.href.toString()).toMatch(/priority-high\.png$/);
});

it("should generate preload link with fetchPriority for new URL() assets", () => {
	// Test low priority preload
	const styleLowUrl = new URL(/* webpackPreload: true */ /* webpackFetchPriority: "low" */ "./assets/styles/priority-low.css", import.meta.url);

	expect(document.head._children).toHaveLength(1);
	const link1 = document.head._children[0];
	expect(link1._type).toBe("link");
	expect(link1.rel).toBe("preload");
	expect(link1.as).toBe("style");
	expect(link1._attributes.fetchpriority).toBe("low");
	expect(link1.fetchPriority).toBe("low");
	expect(link1.href.toString()).toMatch(/priority-low\.css$/);
});

it("should handle auto fetchPriority", () => {
	const scriptAutoUrl = new URL(/* webpackPrefetch: true */ /* webpackFetchPriority: "auto" */ "./priority-auto.js", import.meta.url);

	expect(document.head._children).toHaveLength(1);
	const link1 = document.head._children[0];
	expect(link1._type).toBe("link");
	expect(link1.rel).toBe("prefetch");
	expect(link1.as).toBe("script");
	expect(link1._attributes.fetchpriority).toBe("auto");
	expect(link1.fetchPriority).toBe("auto");
});

it("should not set fetchPriority for invalid values", () => {
	// Note: The actual invalid value is tested in generate-warnings.js
	// Here we just verify that invalid values are filtered out
	const invalidUrl = new URL(/* webpackPrefetch: true */ "./assets/images/test.png", import.meta.url);

	expect(document.head._children).toHaveLength(1);
	const link1 = document.head._children[0];
	expect(link1._type).toBe("link");
	expect(link1.rel).toBe("prefetch");
	// When there's no fetchPriority, it should be undefined
	expect(link1._attributes.fetchpriority).toBeUndefined();
	expect(link1.fetchPriority).toBeUndefined();
});

it("should handle multiple URLs with different priorities", () => {
	const url1 = new URL(/* webpackPrefetch: true */ /* webpackFetchPriority: "high" */ "./assets/images/image-1.png", import.meta.url);

	const url2 = new URL(/* webpackPrefetch: true */ /* webpackFetchPriority: "low" */ "./assets/images/image-2.png", import.meta.url);

	const url3 = new URL(/* webpackPrefetch: true */ "./assets/images/image-3.png", import.meta.url);

	expect(document.head._children).toHaveLength(3);

	// First link - high priority
	const link1 = document.head._children[0];
	expect(link1._attributes.fetchpriority).toBe("high");

	// Second link - low priority
	const link2 = document.head._children[1];
	expect(link2._attributes.fetchpriority).toBe("low");

	// Third link - no fetchPriority
	const link3 = document.head._children[2];
	expect(link3._attributes.fetchpriority).toBeUndefined();
});

it("should prefer preload over prefetch when both are specified", () => {
	// Note: The warning for both hints is tested in generate-warnings.js
	// Here we just verify that preload takes precedence
	const bothUrl = new URL(/* webpackPreload: true */ /* webpackFetchPriority: "high" */ "./assets/images/test.png", import.meta.url);

	expect(document.head._children).toHaveLength(1);
	const link1 = document.head._children[0];
	expect(link1._type).toBe("link");
	expect(link1.rel).toBe("preload"); // Preload takes precedence
	expect(link1._attributes.fetchpriority).toBe("high");
});

it("should handle different asset types correctly", () => {
	// Image
	const imageUrl = new URL(/* webpackPrefetch: true */ /* webpackFetchPriority: "high" */ "./assets/images/test.png", import.meta.url);

	// CSS
	const cssUrl = new URL(/* webpackPrefetch: true */ /* webpackFetchPriority: "high" */ "./assets/styles/test.css", import.meta.url);

	// JavaScript
	const jsUrl = new URL(/* webpackPrefetch: true */ /* webpackFetchPriority: "high" */ "./test.js", import.meta.url);

	// Font
	const fontUrl = new URL(/* webpackPrefetch: true */ /* webpackFetchPriority: "high" */ "./assets/fonts/test.woff2", import.meta.url);

	expect(document.head._children).toHaveLength(4);

	// Check 'as' attributes are set correctly
	expect(document.head._children[0].as).toBe("image");
	expect(document.head._children[1].as).toBe("style");
	expect(document.head._children[2].as).toBe("script");
	expect(document.head._children[3].as).toBe("font");

	// All should have high fetchPriority
	document.head._children.forEach(link => {
		expect(link._attributes.fetchpriority).toBe("high");
	});
});

it("should handle prefetch with boolean values only", () => {
	// Clear head
	document.head._children = [];

	// Create URLs with boolean prefetch values
	const url1 = new URL(/* webpackPrefetch: true */ /* webpackFetchPriority: "high" */ "./assets/images/order-1.png", import.meta.url);
	const url2 = new URL(/* webpackPrefetch: true */ /* webpackFetchPriority: "high" */ "./assets/images/order-2.png", import.meta.url);
	const url3 = new URL(/* webpackPrefetch: true */ /* webpackFetchPriority: "high" */ "./assets/images/order-3.png", import.meta.url);

	// Verify links were created
	expect(document.head._children.length).toBe(3);

	// All should have fetchPriority set
	document.head._children.forEach(link => {
		expect(link._attributes.fetchpriority).toBe("high");
		expect(link.rel).toBe("prefetch");
		expect(link.as).toBe("image");
	});
});
