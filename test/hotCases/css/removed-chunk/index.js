/**
 * @param {boolean} removedLoaded whether the removable stylesheet is loaded
 * @param {boolean} lateLoaded whether the stylesheet imported during ready is loaded
 * @param {boolean} sharedLoaded whether the page keeps the stylesheet only another entry still uses
 * @returns {void}
 */
const expectStyles = (removedLoaded, lateLoaded = false, sharedLoaded = true) => {
	if (typeof document === "undefined") {
		expect(__webpack_css_server_styles__.includes("color: red")).toBe(removedLoaded);
		expect(__webpack_css_server_styles__).toContain("color: blue");
		expect(__webpack_css_server_styles__).toContain("color: purple");
		expect(__webpack_css_server_styles__).toContain("color: teal");
		expect(__webpack_css_server_styles__).not.toContain("color: green");
		expect(__webpack_css_server_styles__.includes("color: orange")).toBe(lateLoaded);
	} else {
		const links = Array.from(document.getElementsByTagName("link"));
		expect(links.some(link => link.href.includes("/removed."))).toBe(removedLoaded);
		expect(links.some(link => link.href.includes("/kept_css."))).toBe(true);
		expect(links.some(link => link.href.includes("/shared."))).toBe(sharedLoaded);
		expect(links.some(link => link.href.includes("/page."))).toBe(true);
		expect(links.some(link => link.href.includes("/unused."))).toBe(false);
		expect(links.some(link => link.href.includes("/late."))).toBe(lateLoaded);
	}
};

/** @returns {Promise<void>} the next compilation */
const rebuild = () =>
	new Promise((resolve, reject) => {
		NEXT(error => error ? reject(error) : resolve());
	});

it("should remove a loaded chunk's styles on apply and load them again when restored", async () => {
	if (typeof document !== "undefined") {
		// The HTML of a page whose entry loads "page" initially already links its stylesheet.
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = __webpack_require__.p + __webpack_require__.k("page");
		document.head.appendChild(link);
	}
	await Promise.all([
		import("./kept.css"),
		require("./owner").load(),
		require("./owner").loadShared(),
		require("./owner").loadPage()
	]);
	expectStyles(true);

	await rebuild();
	await module.hot.check(false);
	expect(module.hot.status()).toBe("ready");
	expectStyles(true);
	await require("./owner").loadLate();
	expectStyles(true, true);
	await module.hot.apply();
	// The server registry serves every entry, so it keeps what "other" still uses.
	expectStyles(false, false, false);

	await rebuild();
	await module.hot.check(true);
	await require("./owner").load();
	expectStyles(true, false, false);
});
