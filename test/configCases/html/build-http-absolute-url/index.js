import page from "./page.html";

it("should bundle an absolute http(s) URL referenced from HTML when experiments.buildHttp is enabled", () => {
	expect(typeof page).toBe("string");
	expect(page).toMatchSnapshot();
	// The remote URL is fetched (from the lockfile cache) and rewritten to a
	// local, hashed asset — like any other asset URL.
	expect(page).not.toContain("https://raw.githubusercontent.com");
	expect(page).toMatch(/<img src="[0-9a-f]+\.svg" alt="remote">/);
});
