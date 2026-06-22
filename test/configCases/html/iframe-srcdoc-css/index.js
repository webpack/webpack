import page from "./page.html";

it("should process CSS inside <iframe srcdoc> (@import, url(), and <link>)", () => {
	expect(typeof page).toBe("string");
	expect(page).toMatchSnapshot();

	// `<style>@import "./imported.css"</style>` has no `=` and no `url(`, so it
	// survives the `SRCDOC_ASSET_REGEXP` pre-filter only via `@import`; the
	// imported stylesheet is resolved and inlined into the `<style>`.
	expect(page).toContain("color: red;");
	expect(page).not.toContain("@import");

	// `url("./pixel.png")` inside a `<style>` is rewritten like any other asset.
	expect(page).toContain("url(handled-pixel.png)");

	// `<link rel="stylesheet" href="./linked.css">` is valid in srcdoc: per the
	// HTML spec an `about:srcdoc` document inherits its container's base URL, so
	// the relative href resolves against this file. webpack bundles it into a CSS
	// chunk and rewrites the href away from the source path.
	expect(page).toMatch(
		/srcdoc="<link rel=&quot;stylesheet&quot; href=&quot;[^"]+\.css&quot;>"/
	);
	expect(page).not.toContain("./linked.css");

	// All three srcdoc documents reference an asset, so each becomes a module.
	const ids = __STATS__.modules.map((m) => m.identifier || m.name || "");
	expect(ids.filter((id) => id.includes("data:text/html"))).toHaveLength(3);
});
