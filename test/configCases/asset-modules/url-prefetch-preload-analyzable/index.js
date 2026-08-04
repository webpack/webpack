import fs from "fs";
import path from "path";

const findLink = (predicate) =>
	document.head._children.find(
		(el) => el._type === "link" && predicate(el)
	);

it("should still inject the <link> for a hinted new URL()", () => {
	// The hint is fired by the chunk's startup runtime, not by the call site, so it
	// must exist before any user code runs — even though the call site is a literal.
	const prefetched = findLink((l) => l.href.endsWith("/image.png"));
	expect(prefetched).toBeDefined();
	expect(prefetched.rel).toBe("prefetch");

	const preloaded = findLink((l) => l.href.endsWith("/font.woff2"));
	expect(preloaded).toBeDefined();
	expect(preloaded.rel).toBe("preload");
	expect(preloaded.as).toBe("font");
});

it("should build the <link> href from a generator publicPath", () => {
	// The startup hint must use the asset's own url, not `output.publicPath` +
	// filename, or the preload points at a different origin than the call site.
	const preloaded = findLink((l) => l.href.endsWith("/cdn.svg"));
	expect(preloaded).toBeDefined();
	expect(preloaded.href).toBe("https://cdn.example.com/cdn.svg");

	const icon = new URL(/* webpackPreload: true */ "./cdn.svg", import.meta.url);
	expect(icon.href).toBe("https://cdn.example.com/cdn.svg");
});

it("should resolve the hinted URLs correctly", () => {
	const image = new URL(/* webpackPrefetch: true */ "./image.png", import.meta.url);
	const font = new URL(/* webpackPreload: true */ "./font.woff2", import.meta.url);

	expect(image.href).toBe("https://example.com/public/image.png");
	expect(font.href).toBe("https://example.com/public/font.woff2");
});

it("should emit the analyzable literal for hinted new URL() refs", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "main.mjs"),
		"utf8"
	);
	// Needles are built at runtime so they are not source string literals here.
	const marker = `/* asset ${"import"} */`;

	// The hint's magic comment is preserved before the substituted literal.
	expect(bundle).toContain(
		`${marker} "https://example.com/public/image.png", import.meta.url)`
	);
	expect(bundle).toContain(
		`${marker} "https://example.com/public/font.woff2", import.meta.url)`
	);
	// The asset's JS wrapper is dropped — nothing requires the asset module.
	expect(bundle).not.toContain(`${"__webpack_require__"}(/*! ./image.png`);
	expect(bundle).not.toContain(`${"__webpack_require__"}(/*! ./font.woff2`);
});
