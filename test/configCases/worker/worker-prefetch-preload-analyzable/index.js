import fs from "fs";
import path from "path";

it("should emit the analyzable worker form even with a resource hint", () => {
	// eslint-disable-next-line no-new
	new Worker(
		new URL(/* webpackPreload: true */ "./preload.worker.js", import.meta.url)
	);

	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "main.mjs"),
		"utf8"
	);
	const marker = `/* worker ${"import"} */`;

	// The specifier stays a literal — the hint no longer wraps it.
	expect(bundle).toContain(`${marker} "./preload_worker_js.mjs"`);
	expect(bundle).not.toContain(`${marker} ${"__webpack_require__"}.`);
});

it("should still inject the <link> for a hinted worker", () => {
	// Fired by the chunk's startup runtime, so it exists before this body runs.
	const link = document.head._children.find(
		(el) =>
			el._type === "link" &&
			el.rel === "preload" &&
			String(el.href).includes("preload_worker_js")
	);

	expect(link).toBeDefined();
	expect(link.as).toBe("script");
});
