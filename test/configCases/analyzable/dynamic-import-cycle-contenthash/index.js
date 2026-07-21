import fs from "fs";
import path from "path";

it("should keep the runtime form on a chunk-group cycle instead of erroring", async () => {
	// chunk-a and chunk-b import each other, so both are async chunks that hash in the
	// same pass — neither is guaranteed hashed before the other, so each cyclic edge is
	// not ordering-safe and keeps the runtime form (and the build must not throw).
	const a = await import(/* webpackChunkName: "chunk-a" */ "./a.js");
	expect(a.default).toBe("a");
	const b = await import(/* webpackChunkName: "chunk-b" */ "./b.js");
	expect(b.default).toBe("b");
	const b2 = await a.loadB();
	expect(b2.default).toBe("b");
	const a2 = await b.loadA();
	expect(a2.default).toBe("a");

	const files = fs.readdirSync(__STATS__.outputPath);
	const chunkA = files.find((f) => /^chunk-a\./.test(f));
	const chunkB = files.find((f) => /^chunk-b\./.test(f));
	expect(chunkA).toBeDefined();
	expect(chunkB).toBeDefined();
	const contentA = fs.readFileSync(
		path.join(__STATS__.outputPath, chunkA),
		"utf8"
	);
	const contentB = fs.readFileSync(
		path.join(__STATS__.outputPath, chunkB),
		"utf8"
	);
	// The cyclic edges keep `ensureChunk` — no baked literal to the other chunk.
	expect(contentA).toContain(`${"__webpack_require__"}.e(`);
	expect(contentB).toContain(`${"__webpack_require__"}.e(`);
	expect(contentA).not.toContain('import("./chunk-b');
	expect(contentB).not.toContain('import("./chunk-a');
});
