import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

it("should resolve new URL(..., import.meta.url) to the emitted asset", () => {
	const url = new URL("./file.png", import.meta.url);

	expect(url.protocol).toBe("file:");
	expect(fs.readFileSync(fileURLToPath(url), "utf8")).toBe("PNG-CONTENT-AUTO");
});

it("should emit the analyzable literal form for module output", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	// Needles are built at runtime so they are not present as source string
	// literals in the bundle — the only match is the transformed `new URL` call.
	const marker = `/* asset ${"import"} */`;
	const baseURI = `${"__webpack_require__"}.b`;

	expect(bundle).toContain(`new URL(${marker} "./file.png", import.meta.url)`);
	expect(bundle).not.toContain(baseURI);
});
