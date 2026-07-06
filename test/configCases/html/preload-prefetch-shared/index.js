import { state } from "./counter.js";
import "./used.js";
import page from "./page.html";

it("should build a preload/prefetch target that is also used in code and as a real entry", () => {
	expect(typeof page).toBe("string");
	expect(page).toMatchSnapshot();

	// The real `<script src>` entry is rewritten to its chunk URL.
	expect(page).not.toContain('src="./shared.js"');
	expect(page).toMatch(/<script src="__html_[^"]+\.js"><\/script>/);

	// Both the preload and prefetch of `shared.js` are rewritten to chunk
	// URLs — an entry being preloaded is not a conflict.
	expect(page).not.toContain('href="./shared.js"');
	expect(page).toMatch(/<link rel="preload" as="script" href="__html_[^"]+\.js">/);
	expect(page).toMatch(/<link rel="prefetch" as="script" href="__html_[^"]+\.js">/);

	// `used.js` is preloaded and also imported from code — its hint is
	// still rewritten to a chunk URL.
	expect(page).not.toContain('href="./used.js"');

	// A resource hint injects no sibling tags.
	expect(page).not.toContain("<script>");
});

it("should execute code-imported and entry modules exactly once", () => {
	// `used.js` is reachable from index.js, shared.js and the preload/prefetch
	// entries, yet the module is shared in the graph — the code-imported copy
	// runs exactly once for this runtime.
	expect(state.count).toBe(1);
});
