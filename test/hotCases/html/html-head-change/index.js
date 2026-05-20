import html from "./page.html";

it("should fall back to a full reload when the HTML <head> changes beyond <title>", (done) => {
	// Initial: simulate the browser having rendered the extracted .html
	// page. The HMR shim's reload / DOM-patch branch is guarded behind
	// `module.hot.data`, so it does NOT run on the first evaluation —
	// we only see the dispose handler capturing the current head.
	const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
	document.body.innerHTML = bodyMatch[1];
	expect(window.location.__reloadCount__ || 0).toBe(0);

	NEXT(
		require("../../update")(done, true, () => {
			// The new HTML kept `<title>` identical but flipped a
			// `<meta>` attribute in `<head>`. webpack injects its own
			// runtime `<script>`s into `<head>` on the real page so we
			// can't safely replace the head innerHTML — the shim
			// falls back to `window.location.reload()` instead, which
			// the dev server resolves by re-serving the regular
			// (non-hot-update) `page.html` chunk emitted by the latest
			// rebuild.
			expect(window.location.__reloadCount__).toBe(1);
			// DOM patching skipped: body stays at its initial value (we
			// only set it once, no replacement happened during the
			// reload-only path).
			expect(document.body.innerHTML).toContain("head test");
			done();
		})
	);
});
