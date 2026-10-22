import html from "./page.html";

it("should hot-update an HTML module that contains both inline <style> and inline <script>", (done) => {
	// Inline `<style>` bodies go through the CSS pipeline and the processed CSS is
	// inlined back into the rewritten HTML, so it appears verbatim. Inline `<script>`
	// bodies become their own data-URI entries, referenced only via `<script src=…>`.
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
