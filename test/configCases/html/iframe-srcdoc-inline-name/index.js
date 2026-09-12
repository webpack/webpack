import home from "./home.html";

it("should name a srcdoc's inline script after its entry, not the page", () => {
	// The srcdoc is a page webpack writes and its `<script>` carries no url,
	// so neither lends a name — the entry's own is used.
	expect(home).toMatch(/src=&quot;__html_[0-9a-f]+_\d+\.js&quot;/);
	expect(home).not.toMatch(/src=&quot;home\d*\.js&quot;/);
});
