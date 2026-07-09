const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name));
const readHtml = (name) => read(name).toString("utf-8");

// Every algorithm in an `integrity` value must be the real hash of the file.
const sriMatches = (file, value) =>
	value.split(" ").every((part) => {
		const algorithm = part.slice(0, part.indexOf("-"));
		return (
			part ===
			`${algorithm}-${crypto.createHash(algorithm).update(read(file)).digest("base64")}`
		);
	});

const tagsWithIntegrity = (html) => {
	const out = [];
	for (const tag of html.match(/<(?:script|link)\b[^>]*>/g) || []) {
		const integrity = tag.match(/integrity="([^"]+)"/);
		if (!integrity) continue;
		const url = tag.match(/(?:src|href)="([^"]+)"/);
		out.push({ kind: tag.startsWith("<script") ? "script" : "link", url: url[1], integrity: integrity[1] });
	}
	return out;
};

it("integrity: true emits a correct sha384 on the script and the link", () => {
	const tags = tagsWithIntegrity(readHtml("bool.html"));
	expect(tags).toHaveLength(2);
	for (const tag of tags) {
		expect(tag.integrity.startsWith("sha384-")).toBe(true);
		expect(sriMatches(tag.url, tag.integrity)).toBe(true);
	}
});

it("integrity: array emits every algorithm, each correct", () => {
	const tags = tagsWithIntegrity(readHtml("array.html"));
	expect(tags).toHaveLength(2);
	for (const tag of tags) {
		expect(tag.integrity).toMatch(/^sha256-\S+ sha512-\S+$/);
		expect(sriMatches(tag.url, tag.integrity)).toBe(true);
	}
});

it("integrity is emitted on cloned sibling tags (split runtime chunk)", () => {
	const tags = tagsWithIntegrity(readHtml("split.html"));
	// runtime `<script>` + entry `<script>` + the CSS `<link>`.
	expect(tags.filter((t) => t.kind === "script").length).toBeGreaterThan(1);
	for (const tag of tags) {
		expect(tag.integrity.startsWith("sha384-")).toBe(true);
		expect(sriMatches(tag.url, tag.integrity)).toBe(true);
	}
});

it("integrity is emitted on synthesized tags (custom element mapped to script)", () => {
	const tags = tagsWithIntegrity(readHtml("custom.html"));
	// The runtime sibling is a freshly built `<script>` (the `<my-script>`
	// entry tag can't be cloned), and it must carry a correct integrity.
	expect(tags.some((t) => t.kind === "script")).toBe(true);
	for (const tag of tags) {
		expect(sriMatches(tag.url, tag.integrity)).toBe(true);
	}
});

it("integrity: function decides per asset (false skips, array sets algorithms)", () => {
	const html = readHtml("fn.html");
	const tags = tagsWithIntegrity(html);
	// The function returns false for `.css` and ['sha384'] otherwise.
	expect(tags).toHaveLength(1);
	expect(tags[0].kind).toBe("script");
	expect(sriMatches(tags[0].url, tags[0].integrity)).toBe(true);
	expect(html).toMatch(/<link rel="stylesheet"[^>]*>/);
	expect(html).not.toMatch(/<link[^>]*integrity/);
});

it("integrity replaces an authored `integrity` attribute instead of duplicating it", () => {
	const html = readHtml("authored.html");
	const tags = tagsWithIntegrity(html);
	// The rewritten entry `<script>` plus the runtime sibling cloned from it.
	expect(tags.length).toBeGreaterThan(1);
	// The authored value is dropped (content-specific) on both the rewritten
	// entry tag and the clone — never left beside the per-chunk one, so the
	// number of `integrity=` occurrences equals the number of tags (one each).
	expect((html.match(/integrity=/g) || []).length).toBe(tags.length);
	expect(html).not.toContain("authorPlaceholder");
	for (const tag of tags) {
		expect(tag.kind).toBe("script");
		expect(sriMatches(tag.url, tag.integrity)).toBe(true);
	}
});

it("integrity covers preload links (with crossorigin) but not prefetch", () => {
	const html = readHtml("preload.html");
	const tags = tagsWithIntegrity(html);
	// Two `<link rel="preload" as="script">`, one `as="style"`, and the entry
	// `<script>` — each carrying a correct SRI hash of its referenced file.
	const links = tags.filter((tag) => tag.kind === "link");
	expect(links.length).toBe(3);
	for (const tag of tags) {
		expect(sriMatches(tag.url, tag.integrity)).toBe(true);
	}
	// No duplicated `integrity`, and the authored value was replaced.
	expect((html.match(/integrity=/g) || []).length).toBe(tags.length);
	expect(html).not.toContain("authorPreload");
	// SRI needs CORS: every preload `<link>` carries `crossorigin`.
	for (const tag of html.match(/<link[^>]*>/g) || []) {
		if (/rel="preload"/.test(tag)) {
			expect(tag).toMatch(/crossorigin="anonymous"/);
		}
	}
	// `prefetch` is not integrity-eligible per the SRI spec — left untouched.
	const prefetch = html.match(/<link[^>]*rel="prefetch"[^>]*>/);
	expect(prefetch).toBeTruthy();
	expect(prefetch[0]).not.toMatch(/integrity=/);
	expect(prefetch[0]).not.toMatch(/crossorigin=/);
});

it("no emitted JS ships an unresolved integrity sentinel", () => {
	// A JS chunk can embed the HTML string; its sentinel must be stripped, not
	// resolved late (that would corrupt the chunk's content hash and its SRI).
	for (const file of fs.readdirSync(__dirname)) {
		// Skip this test file itself — copied in as `test.js`, it mentions the
		// sentinel in assertions below.
		if (!file.endsWith(".js") || file === "test.js") continue;
		expect(read(file).toString("utf-8")).not.toContain(
			"__WEBPACK_HTML_INTEGRITY__"
		);
	}
});
