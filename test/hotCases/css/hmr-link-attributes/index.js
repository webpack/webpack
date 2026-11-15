import "./index.css";

/** @returns {Promise<void>} */
const rebuild = () => new Promise((resolve, reject) => {
	NEXT(error => error ? reject(error) : resolve());
});

it("should preserve stylesheet attributes and disabled state across hot updates", async () => {
	const attributes = {
		media: "(prefers-color-scheme: dark)",
		title: "theme",
		id: "theme-styles",
		class: "theme",
		"data-theme": "dark",
		"data-empty": "",
		"aria-label": "Theme styles",
		referrerpolicy: "no-referrer",
		crossorigin: "anonymous",
		fetchpriority: "low",
		type: "text/css"
	};
	const original = document.getElementsByTagName("link")[0];
	for (const [name, value] of Object.entries(attributes)) {
		original.setAttribute(name, value);
	}
	original.setAttribute("href", original.href);
	original.nonce = "page-nonce";
	original.setAttribute("integrity", "sha256-old");
	original.setAttribute("onload", "throw new Error('old load handler')");
	original.setAttribute("onerror", "throw new Error('old error handler')");
	original.setAttribute("data-webpack-loading", "old");
	original.setAttribute("data-webpack", "old");
	original.setAttribute("data-hook", "old");
	original.setAttribute("disabled", "");
	original.sheet.disabled = true;
	expect(original.sheet.css).toContain("color: red;");

	await rebuild();
	await module.hot.check(false);
	const replacement = [...document.getElementsByTagName("link")].find(link => link !== original);
	expect(replacement).toBeDefined();
	expect(replacement.href).toContain("?hmr=");
	expect(replacement.sheet.css).toContain("color: blue;");
	for (const [name, value] of Object.entries(attributes)) {
		expect(replacement.getAttribute(name)).toBe(value);
	}
	expect(replacement.getAttribute("nonce")).toBe("page-nonce");
	expect(replacement.getAttribute("integrity")).toBe("sha256-current");
	expect(replacement.getAttribute("data-hook")).toBe("current");
	expect(replacement.getAttribute("onload")).toBeUndefined();
	expect(replacement.getAttribute("onerror")).toBeUndefined();
	expect(replacement.getAttribute("data-webpack-loading")).toBeUndefined();
	expect(replacement.getAttribute("data-webpack")).not.toBe("old");
	expect(replacement.getAttribute("disabled")).toBeUndefined();
	expect(replacement.sheet.disabled).toBe(true);
	await module.hot.apply();
	expect(original.parentNode).toBeUndefined();
	expect(replacement.getAttribute("disabled")).toBe("");
	expect(replacement.sheet.disabled).toBe(true);

	replacement.removeAttribute("disabled");
	replacement.removeAttribute("media");
	replacement.sheet.disabled = true;
	__webpack_nonce__ = "updated-nonce";
	await rebuild();
	await module.hot.check(true);
	const disabledSheet = document.getElementsByTagName("link")[0];
	expect(disabledSheet).not.toBe(replacement);
	expect(disabledSheet.sheet.css).toContain("color: green;");
	expect(disabledSheet.getAttribute("media")).toBeUndefined();
	expect(disabledSheet.getAttribute("disabled")).toBeUndefined();
	expect(disabledSheet.getAttribute("nonce")).toBe("updated-nonce");
	expect(disabledSheet.sheet.disabled).toBe(true);

	disabledSheet.setAttribute("media", "");
	__webpack_nonce__ = undefined;
	await rebuild();
	await module.hot.check(false);
	disabledSheet.setAttribute("disabled", "disabled");
	disabledSheet.sheet.disabled = false;
	await module.hot.apply();
	const enabled = document.getElementsByTagName("link")[0];
	expect(enabled).not.toBe(disabledSheet);
	expect(enabled.sheet.css).toContain("color: yellow;");
	expect(enabled.getAttribute("media")).toBe("");
	expect(enabled.getAttribute("disabled")).toBe("disabled");
	expect(enabled.getAttribute("nonce")).toBe("updated-nonce");
	expect(enabled.sheet.disabled).toBe(false);
});
