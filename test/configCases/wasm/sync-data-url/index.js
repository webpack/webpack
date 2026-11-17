import fs from "fs";
import path from "path";

it("should emit only the bytes of a wasm module from a data: URL", async () => {
	const wasm = await import(
		"data:application/wasm;base64,AGFzbQEAAAABBQFgAAF/AwIBAAcHAQNhbnMAAAoGAQQAQSoL"
	);
	expect(wasm.ans()).toBe(42);
	const files = fs
		.readdirSync(__STATS__.outputPath)
		.filter((file) => file.endsWith(".wasm"));
	expect(files).toHaveLength(1);
	const emitted = fs.readFileSync(path.join(__STATS__.outputPath, files[0]));
	// The 36-byte module only gains an empty init function
	expect(emitted.length).toBeLessThan(64);
	expect(WebAssembly.validate(emitted)).toBe(true);
});
