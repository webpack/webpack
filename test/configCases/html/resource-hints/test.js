const fs = require("fs");
const path = require("path");

const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
const head = page.slice(0, page.indexOf("</head>"));

it("should inject literal href hints (preconnect, font preload)", () => {
	expect(head).toContain(
		'<link rel="preconnect" href="https://cdn.example.com">'
	);
	expect(head).toContain(
		'<link rel="preload" as="font" type="font/woff2" href="/fonts/inter.woff2" crossorigin="anonymous">'
	);
});

it("should resolve an `entry` ref, inheriting crossorigin but not SRI on prefetch", () => {
	// `entry: "second"` expands to the second entrypoint's chunks (runtime + entry).
	const tag = head.match(
		/<link rel="prefetch" as="script" href="second\.js"[^>]*>/
	)[0];
	expect(tag).toContain('crossorigin="anonymous"');
	// `prefetch` is not SRI-eligible, so no integrity even though it's globally on.
	expect(tag).not.toContain("integrity");
});

it("should inherit output.html.integrity and crossorigin on a chunk preload", () => {
	// `{ chunk: "runtime" }` inherits crossorigin + SRI from the global options.
	const runtime = head.match(
		/<link rel="preload" as="script" href="runtime\.js"[^>]*>/g
	);
	expect(runtime).toHaveLength(1);
	expect(runtime[0]).toContain('crossorigin="anonymous"');
	expect(runtime[0]).toMatch(/integrity="sha/);
});

it("should let a hint opt out of SRI with integrity: false", () => {
	const tag = head.match(
		/<link rel="preload" as="script" href="second\.js"[^>]*>/
	)[0];
	expect(tag).toContain('crossorigin="anonymous"');
	expect(tag).not.toContain("integrity");
});

it("should drop unresolvable and empty hints", () => {
	// preconnect without href, and preload/prefetch pointing at unknown
	// chunk/entry names, plus a bare descriptor, all emit nothing.
	expect(head.match(/rel="preconnect"/g)).toHaveLength(1);
	expect(head).not.toContain("does-not-exist");
});
