import home from "./home.html";

it("should name a srcdoc's inline script after the page holding it", () => {
	// The srcdoc is a page webpack writes, so it has no path of its own and
	// its `<script>` carries no url — the page holding it lends the name.
	expect(home).toMatch(/src=&quot;home\d*\.js&quot;/);
	expect(home).not.toContain("var marker");
});
