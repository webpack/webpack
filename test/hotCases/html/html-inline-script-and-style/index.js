import html from "./page.html";

it("should hot-update an HTML module that contains both inline <style> and inline <script>", (done) => {
	// Inline `<style>` bodies are routed through the CSS pipeline and the
	// processed CSS is inlined back into the rewritten HTML (exportType
	// "text"), so it appears verbatim. Inline `<script>` bodies are
	// bundled as their own data-URI entries — the rewritten HTML only
	// references them via `<script src=…>`, so the script body itself
	// does NOT appear in the exported string.
	expect(html).toContain("<title>combined v1</title>");
	expect(html).toContain("color: red");
	expect(html).not.toContain('window.__page_value__ = "v1"');
	expect(html).toMatch(/<script src="[^"]+\.js"/);

	NEXT(
		require("../../update")(done, true, () => {
			const updated = require("./page.html");
			expect(updated).toContain("<title>combined v2</title>");
			expect(updated).toContain("color: blue");
			expect(updated).not.toContain("color: red");
			expect(updated).not.toContain("v1</title>");
			done();
		})
	);
});
