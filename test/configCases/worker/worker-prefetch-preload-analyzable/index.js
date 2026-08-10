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

it("should skip workers and blocks without a hint", async () => {
	// Exercises the startup-hint pass's skip paths: a block dependency that is not a
	// worker, a worker carrying no hint, and a second reference to an already-seen
	// worker chunk. Only the hinted chunk may produce a `<link>`.
	// eslint-disable-next-line no-new
	new Worker(new URL("./plain.worker.js", import.meta.url));
	// eslint-disable-next-line no-new
	new Worker(
		new URL(/* webpackPreload: true */ "./preload.worker.js", import.meta.url)
	);
	expect((await import("./lazy.js")).default).toBe(42);

	const links = document.head._children.filter((el) => el._type === "link");
	expect(links.filter((l) => String(l.href).includes("plain_worker_js"))).toHaveLength(0);
	expect(links.filter((l) => String(l.href).includes("preload_worker_js"))).toHaveLength(1);
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
