import relative from "./relative.html";
import deep from "./deep.html";
import dotseg from "./dotseg.html";
import external from "./external.html";
import root from "./root.html";
import rootDir from "./root-dir.html";
import protocolRelative from "./protocol-relative.html";
import escape from "./escape.html";
import query from "./query.html";
import entity from "./entity.html";

it("should resolve relative URLs against a relative <base href>", () => {
	// `logo.png` only exists under `nested/`; a successful build with a rewritten
	// URL proves it was resolved through `<base href="nested/">`.
	expect(relative).not.toContain('src="logo.png"');
	// The emitted URL is prefixed with `../` (one per base segment) so the base
	// can't misdirect it: the browser resolves `nested/../<hash>.png`.
	expect(relative).toMatch(/<img src="\.\.\/[^"]+\.png" alt="resolved via base">/);
	// A root-relative URL ignores the base for resolution but is still a bundled
	// (relative) output URL, so it gets the same counteraction prefix.
	expect(relative).not.toContain('src="/abs.png"');
	expect(relative).toMatch(/<img src="\.\.\/[^"]+\.png" alt="root-relative/);
	// A scheme URL is left untouched entirely.
	expect(relative).toContain("data:image/png;base64,");
	expect(relative).toContain('<base href="nested/">');
	expect(relative).toMatchSnapshot();
});

it("should prefix one `../` per segment of a deep relative base", () => {
	// `<base href="assets/img/">` is two segments deep.
	expect(deep).toMatch(/<img src="\.\.\/\.\.\/[^"]+\.png" alt="resolved two levels deep">/);
	expect(deep).toMatchSnapshot();
});

it("should normalize dot-segments in the base href", () => {
	// `<base href="assets/img/.."`> normalizes to `assets/`; `dot.png` only
	// exists at `assets/dot.png`, so a successful build proves the `..` was
	// resolved (not left as `assets/img/`). The prefix is one segment deep.
	expect(dotseg).toMatch(
		/<img src="\.\.\/[^"]+\.png" alt="dot-segment normalized base">/
	);
	expect(dotseg).toMatchSnapshot();
});

it("should leave URLs untouched under an absolute <base href>", () => {
	// The base points outside the build, so `remote-only.png` is not bundled —
	// it stays verbatim and the browser loads it from the external base.
	expect(external).toContain('src="remote-only.png"');
	expect(external).toMatchSnapshot();
});

it("should leave URLs untouched under a protocol-relative <base href>", () => {
	expect(protocolRelative).toContain('src="remote-only.png"');
});

it("should resolve relative URLs against the page under a root-relative <base href>", () => {
	// A root-relative base names where the page's own directory is served, so
	// `abs.png` is bundled from beside the page, as without a base.
	expect(root).not.toContain('src="abs.png"');
	expect(root).toMatch(/<img src="[^"]+\.png" alt="resolved beside the page">/);
	expect(root).toMatchSnapshot();
	expect(rootDir).not.toContain('src="abs.png"');
	expect(rootDir).toMatch(/<img src="[^"]+\.png" alt="resolved against the page">/);
});

it("should handle a base that escapes above the document dir without warning", () => {
	// No `../` counteraction is applied (the doc's own dir name is unknown), and
	// no warning is emitted — the absence of a warnings.js makes the harness fail
	// on any warning. The scheme URL stays untouched.
	expect(escape).toContain("data:image/png;base64,");
	expect(escape).toContain('<base href="../up/">');
	expect(escape).toMatchSnapshot();
});

it("should drop a base's query and fragment and decode its entities", () => {
	// `logo.png` only exists under `nested/`, so each build proves the base
	// resolved to that directory, and the emitted URL cancels it.
	expect(query).toMatch(/<img src="\.\.\/[^"]+\.png" alt="query and fragment ignored">/);
	expect(entity).toMatch(/<img src="\.\.\/[^"]+\.png" alt="entity decoded">/);
});
