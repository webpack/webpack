it("should handle import.meta.url in URL()", () => {
	const url = new URL("./index.css?query=yes#fragment", import.meta.url);

	// query/fragment are folded into the CSS entry chunk name
	expect(url.href).toBe("public/index_css_query_yes_fragment.bundle0.css");
	expect(url.origin).toBe("");
	expect(url.protocol).toBe("");
	expect(url.username).toBe("");
	expect(url.password).toBe("");
	expect(url.host).toBe("");
	expect(url.hostname).toBe("");
	expect(url.port).toBe("");
	expect(url.pathname).toBe("public/index_css_query_yes_fragment.bundle0.css");
	expect(url.search).toBe("");
	expect(url.hash).toBe("");
	expect(url + "").toBe("public/index_css_query_yes_fragment.bundle0.css");
	expect(url.toString()).toBe("public/index_css_query_yes_fragment.bundle0.css");
	expect(JSON.stringify(url)).toBe(
		'"public/index_css_query_yes_fragment.bundle0.css"'
	);
	expect(url instanceof URL).toBe(true);
});
