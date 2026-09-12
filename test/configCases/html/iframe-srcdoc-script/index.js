import page from "./page.html";

it("should bundle <script> inside <iframe srcdoc> as an entry chunk", () => {
	expect(typeof page).toBe("string");
	expect(page).toMatchSnapshot();

	// External `<script src="./app.js">` is rewritten away from the source path
	// to a bundled chunk URL — the same pipeline as a top-level `<script src>`.
	expect(page).not.toContain("./app.js");
	expect(page).toMatch(
		/srcdoc="<script[^"]*src=&quot;[^"]+\.js&quot;[^"]*><\/script>"/
	);

	// Inline `<script>var marker = 1;</script>` body is bundled too (it passes the
	// `SRCDOC_ASSET_REGEXP` pre-filter via the `=`), so its raw body is gone.
	expect(page).not.toContain("var marker = 1;");

	// Each script-bearing srcdoc spins up a nested data:text/html module.
	const ids = __STATS__.modules.map((m) => m.identifier || m.name || "");
	expect(
		ids.filter((id) => id.includes("data:text/html")).length
	).toBeGreaterThanOrEqual(2);

	// The bundled scripts become their own emitted JS chunks: one named after
	// its `src`, and the inline body after the page that carries it.
	const names = __STATS__.assets.map((a) => a.name);
	expect(names).toContain("app.js");
	expect(names).toContain("page.js");
});
