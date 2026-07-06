import page from "./page.html";

it("should rewrite <link rel=preload/prefetch> of a bundled script/style to chunk URLs", () => {
	expect(typeof page).toBe("string");
	expect(page).toMatchSnapshot();

	// `as="script"` preload/prefetch → JS chunk URL, tag otherwise kept.
	expect(page).not.toContain('href="./preload-script.js"');
	expect(page).not.toContain('href="./prefetch-script.js"');
	expect(page).toMatch(
		/<link rel="preload" as="script" href="__html_[^"]+\.js">/
	);
	expect(page).toMatch(
		/<link rel="prefetch" as="script" href="__html_[^"]+\.js">/
	);

	// `as="style"` preload → CSS chunk URL.
	expect(page).not.toContain('href="./preload-style.css"');
	expect(page).toMatch(
		/<link rel="preload" as="style" href="__html_[^"]+\.css">/
	);

	// `webpackIgnore` leaves the resource hint untouched.
	expect(page).toContain('<link rel="preload" as="script" href="./ignored.js">');

	// A resource hint references exactly one URL — no sibling tags are injected.
	expect(page).not.toContain("<script");
});
