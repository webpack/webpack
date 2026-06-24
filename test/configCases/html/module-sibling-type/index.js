import page from "./page.html";

it("rewrites type=module in place when cloning a native module <script> sibling", () => {
	expect(typeof page).toBe("string");
	expect(page).toMatchSnapshot();

	// The split-out runtime is injected as a sibling <script>, cloned from the
	// original `<script type="module" src>`. Its `src` is swapped and its `type`
	// value is rewritten in place to `module` (the `typeValueRange` branch).
	expect(page).toMatch(
		/<script[^>]*\btype="module"[^>]*\bsrc="[^"]*html-runtime[^"]*\.mjs"/
	);

	// The entry chunk tag is a module script too.
	expect(page).toMatch(
		/<script[^>]*\btype="module"[^>]*\bsrc="[^"]*__html_[^"]*\.mjs"/
	);

	// No unresolved source path survives.
	expect(page).not.toContain("./entry.js");
});
