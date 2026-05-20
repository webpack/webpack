import html from "./page.html";

it("should hot-update an HTML module whose inline <script> body changed", (done) => {
	// Inline `<script>` bodies become their own data-URI entries; the
	// rewritten HTML references them via `<script src=…>` (so the body
	// itself doesn't appear verbatim in the exported string).
	expect(html).toContain("<title>inline script v1</title>");
	expect(html).toMatch(/<script src="[^"]+\.js"/);

	NEXT(
		require("../../update")(done, true, () => {
			// The HTML module is self-accepting; the new inline-script body
			// produces a different data-URI entry, so the rewritten src is
			// different too. The exported string reflects the new title at
			// minimum.
			const updated = require("./page.html");
			expect(updated).toContain("<title>inline script v2</title>");
			expect(updated).not.toContain("v1</title>");
			done();
		})
	);
});
