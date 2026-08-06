import html from "./page.html";

const headOf = (text) => /<head[^>]*>([\s\S]*?)<\/head>/i.exec(text)[1];

it("should fall back to a full reload when a <script> enters the <head>", (done) => {
	document.head.innerHTML = headOf(html);
	expect(window.location.__reloadCount__ || 0).toBe(0);

	NEXT(
		require("../../update")(done, true, () => {
			// A `<script>` parsed out of a string is already flagged as started,
			// so appending it would never run it — the shim reloads instead.
			expect(window.location.__reloadCount__).toBe(1);
			done();
		})
	);
});
