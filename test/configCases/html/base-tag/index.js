import relative from "./relative.html";
import deep from "./deep.html";
import external from "./external.html";
import root from "./root.html";
import escape from "./escape.html";

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

it("should leave URLs untouched under an absolute <base href>", () => {
	// The base points outside the build, so `remote-only.png` is not bundled —
	// it stays verbatim and the browser loads it from the external base.
	expect(external).toContain('src="remote-only.png"');
	expect(external).toMatchSnapshot();
});

it("should leave URLs untouched under a root-relative <base href>", () => {
	expect(root).toContain('src="server-root.png"');
	expect(root).toMatchSnapshot();
});

it("should handle a base that escapes above the document dir without warning", () => {
	// No `../` counteraction is applied (the doc's own dir name is unknown), and
	// no warning is emitted — the absence of a warnings.js makes the harness fail
	// on any warning. The scheme URL stays untouched.
	expect(escape).toContain("data:image/png;base64,");
	expect(escape).toContain('<base href="../up/">');
	expect(escape).toMatchSnapshot();
});
