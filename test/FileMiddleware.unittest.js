"use strict";

const { Writable } = require("stream");
const FileMiddleware = require("../lib/serialization/FileMiddleware");

// Internal `deserialize(middleware, name, readFile)` exposed for this test.
const deserialize = FileMiddleware._deserialize;

// Matches VERSION in lib/serialization/FileMiddleware.js.
const VERSION = 0x01637077;

/**
 * @param {number[]} sectionLengths positive content section lengths
 * @returns {Buffer} the pack header (version, section count, section lengths)
 */
const buildHeader = (sectionLengths) => {
	const header = Buffer.allocUnsafe(8 + sectionLengths.length * 4);
	header.writeUInt32LE(VERSION, 0);
	header.writeUInt32LE(sectionLengths.length, 4);
	for (const [i, len] of sectionLengths.entries()) {
		header.writeInt32LE(len, 8 + i * 4);
	}
	return header;
};

describe("FileMiddleware deserialize", () => {
	it("reads content that starts exactly at a content-buffer boundary", async () => {
		const content = Buffer.from([1, 2, 3, 4, 5]);
		const header = buildHeader([content.length]);
		// `readFile` returns multiple buffers (as it does for large caches read in
		// chunks). The header fills the first buffer exactly, so the content run
		// begins on a content-buffer boundary — the case that regressed.
		const readFile = () => Promise.resolve([header, content]);

		const result = await deserialize(
			/** @type {InstanceType<typeof FileMiddleware>} */ (
				/** @type {unknown} */ (null)
			),
			"test",
			readFile
		);

		expect(result).toHaveLength(1);
		expect(Buffer.from(/** @type {Buffer} */ (result[0]))).toEqual(content);
	});

	// A build cannot stage either of the next two: shrinking a cache file between
	// `stat` and `read` is a race, and the compressed-write ordering only shows
	// when the destination is slower than the transform. Hence the fake fs.

	/**
	 * A file that reports `size` from `stat` but only ever hands out `available`
	 * bytes — what a cache file truncated between `stat` and `read` looks like.
	 * @param {Buffer} content bytes the file actually holds
	 * @param {number} size size reported by `stat`
	 * @param {Error=} closeError error `close` reports, if any
	 * @returns {EXPECTED_ANY} fake fs plus the read counter
	 */
	const truncatedFs = (content, size, closeError) => {
		let position = 0;
		const state = { reads: 0 };
		return {
			state,
			fs: /** @type {EXPECTED_ANY} */ ({
				stat: jest.fn((_file, callback) =>
					process.nextTick(() => callback(null, { size }))
				),
				open: jest.fn((_file, _flags, callback) =>
					process.nextTick(() => callback(null, 1))
				),
				read: jest.fn((_fd, buffer, offset, length, _position, callback) => {
					state.reads++;
					if (state.reads > 32) {
						process.nextTick(() =>
							callback(new Error("read retried after end of file"))
						);
						return;
					}
					const slice = content.subarray(position, position + length);
					slice.copy(buffer, offset);
					position += slice.length;
					process.nextTick(() => callback(null, slice.length));
				}),
				close: jest.fn((_fd, callback) =>
					process.nextTick(() => callback(closeError || null))
				)
			})
		};
	};

	it("rejects when a cache file is truncated after stat", async () => {
		const content = buildHeader([]);
		const { fs, state } = truncatedFs(content, content.length + 1);

		await expect(
			new FileMiddleware(fs).deserialize(true, { filename: "cache.pack" })
		).rejects.toThrow(/Unexpected end of file/);
		// the read that returns 0 bytes ends it; without the guard it loops
		expect(state.reads).toBe(2);
		expect(fs.close).toHaveBeenCalled();
	});

	it("rejects when a cache file is truncated mid-section", async () => {
		const header = buildHeader([64]);
		const { fs, state } = truncatedFs(
			Buffer.concat([header, Buffer.alloc(8)]),
			header.length + 64
		);

		await expect(
			new FileMiddleware(fs).deserialize(true, { filename: "cache.pack" })
		).rejects.toThrow(/Unexpected end of file/);
		expect(state.reads).toBeLessThan(32);
	});

	it("reports the close error when closing a truncated file fails", async () => {
		const content = buildHeader([]);
		const { fs } = truncatedFs(
			content,
			content.length + 1,
			new Error("close failed")
		);

		await expect(
			new FileMiddleware(fs).deserialize(true, { filename: "cache.pack" })
		).rejects.toThrow(/close failed/);
	});
});

describe("FileMiddleware serialize", () => {
	/**
	 * @param {string} filename cache file name
	 * @param {number} writeDelay ms each write takes to flush
	 * @returns {Promise<{ finishedWhenReplaced: boolean, written: number }>} result
	 */
	const serializeTo = async (filename, writeDelay) => {
		let written = 0;
		const output = new Writable({
			write(chunk, _encoding, callback) {
				written += chunk.length;
				setTimeout(callback, writeDelay);
			}
		});
		let finishedWhenReplaced = false;
		const fs = /** @type {EXPECTED_ANY} */ ({
			mkdir: jest.fn((_path, callback) => callback()),
			createWriteStream: () => output,
			rename: jest.fn((from, _to, callback) => {
				if (from.endsWith("_")) {
					finishedWhenReplaced = output.writableFinished;
				}
				callback();
			})
		});

		await new FileMiddleware(fs).serialize(
			[Buffer.from("content".repeat(64))],
			{
				filename
			}
		);

		if (!output.writableFinished) {
			await new Promise((resolve) => {
				output.once("finish", () => resolve(undefined));
			});
		}
		return { finishedWhenReplaced, written };
	};

	it("waits for gzip output before replacing the cache file", async () => {
		const { finishedWhenReplaced, written } = await serializeTo(
			"/cache/index.pack.gz",
			25
		);
		expect(finishedWhenReplaced).toBe(true);
		expect(written).toBeGreaterThan(0);
	});

	it("waits for brotli output before replacing the cache file", async () => {
		const { finishedWhenReplaced } = await serializeTo(
			"/cache/index.pack.br",
			25
		);
		expect(finishedWhenReplaced).toBe(true);
	});

	it("still replaces the cache file for uncompressed output", async () => {
		const { finishedWhenReplaced } = await serializeTo("/cache/index.pack", 5);
		expect(finishedWhenReplaced).toBe(true);
	});

	it("rejects when the compressed output stream fails", async () => {
		const output = new Writable({
			write(_chunk, _encoding, callback) {
				callback(new Error("disk full"));
			}
		});
		const fs = /** @type {EXPECTED_ANY} */ ({
			mkdir: jest.fn((_path, callback) => callback()),
			createWriteStream: () => output,
			rename: jest.fn((_from, _to, callback) => callback())
		});

		await expect(
			new FileMiddleware(fs).serialize([Buffer.from("content")], {
				filename: "/cache/index.pack.gz"
			})
		).rejects.toThrow(/disk full/);
		expect(fs.rename).not.toHaveBeenCalled();
	});
});

describe("FileMiddleware getReferencedFilenames", () => {
	const { getReferencedFilenames } = FileMiddleware;

	const zlib = require("zlib");

	/**
	 * @param {string} name referenced file name
	 * @returns {Buffer} a lazy pointer section (u64 size + utf-8 name)
	 */
	const buildPointer = (name) => {
		const nameBuffer = Buffer.from(name);
		const buf = Buffer.alloc(8 + nameBuffer.length);
		nameBuffer.copy(buf, 8);
		return buf;
	};

	/**
	 * @param {(Buffer | string)[]} sections content buffers or pointer names
	 * @returns {Buffer} serialized file content
	 */
	const buildFile = (sections) => {
		const buffers = sections.map((s) =>
			typeof s === "string" ? buildPointer(s) : s
		);
		const header = buildHeader(
			sections.map((s, i) =>
				typeof s === "string" ? -buffers[i].length : buffers[i].length
			)
		);
		return Buffer.concat([header, ...buffers]);
	};

	/**
	 * @param {Buffer} content file content returned for any file
	 * @param {number=} maxBytesPerRead cap for a single positional read
	 * @returns {import("../lib/util/fs").IntermediateFileSystem} fake fs
	 */
	// callbacks fire asynchronously like a real fs, so a `throw` inside them
	// is not swallowed by a surrounding Promise executor
	const fsWithFile = (content, maxBytesPerRead = Infinity) =>
		/** @type {EXPECTED_ANY} */ ({
			readFile: (
				/** @type {string} */ _file,
				/** @type {(err: Error | null, content?: Buffer) => void} */ callback
			) => process.nextTick(() => callback(null, content)),
			open: (
				/** @type {string} */ _file,
				/** @type {string} */ _flags,
				/** @type {(err: Error | null, fd?: number) => void} */ callback
			) => process.nextTick(() => callback(null, 1)),
			read: (
				/** @type {number} */ _fd,
				/** @type {Buffer} */ buffer,
				/** @type {number} */ offset,
				/** @type {number} */ length,
				/** @type {number} */ position,
				/** @type {(err: Error | null, bytesRead: number) => void} */ callback
			) => {
				const slice = content.subarray(
					position,
					position + Math.min(length, maxBytesPerRead)
				);
				slice.copy(buffer, offset);
				process.nextTick(() => callback(null, slice.length));
			},
			close: (
				/** @type {number} */ _fd,
				/** @type {(err: Error | null) => void} */ callback
			) => process.nextTick(() => callback(null)),
			stat: (
				/** @type {string} */ _file,
				/** @type {EXPECTED_ANY} */ callback
			) => process.nextTick(() => callback(null, { size: content.length }))
		});

	it("extracts pointer names between content sections", async () => {
		const content = buildFile([
			Buffer.from([1, 2, 3]),
			"file-a",
			Buffer.from([4]),
			"file-b"
		]);
		await expect(
			getReferencedFilenames(fsWithFile(content), "index.pack")
		).resolves.toEqual(["file-a", "file-b"]);
	});

	it("returns no names for files without pointers", async () => {
		const content = buildFile([Buffer.from([1, 2, 3])]);
		await expect(
			getReferencedFilenames(fsWithFile(content), "index.pack")
		).resolves.toEqual([]);
	});

	it("handles partial positional reads", async () => {
		const content = buildFile([Buffer.from([1, 2, 3]), "file-a"]);
		await expect(
			getReferencedFilenames(fsWithFile(content, 3), "index.pack")
		).resolves.toEqual(["file-a"]);
	});

	it("rejects on a truncated file", async () => {
		const content = buildFile(["file-a"]).subarray(0, 10);
		await expect(
			getReferencedFilenames(fsWithFile(content), "index.pack")
		).rejects.toThrow(/Unexpected end of file/);
	});

	it("rejects on a corrupt section count instead of crashing", async () => {
		// valid magic but an absurd section count that must not be allocated
		const content = Buffer.alloc(8);
		content.writeUInt32LE(VERSION, 0);
		content.writeUInt32LE(0xffffffff, 4);
		await expect(
			getReferencedFilenames(fsWithFile(content), "index.pack")
		).rejects.toThrow(/Invalid section size/);
	});

	it("supports gzip and brotli compressed files", async () => {
		const content = buildFile(["file-a"]);
		await expect(
			getReferencedFilenames(
				fsWithFile(zlib.gzipSync(content)),
				"index.pack.gz"
			)
		).resolves.toEqual(["file-a"]);
		await expect(
			getReferencedFilenames(
				fsWithFile(zlib.brotliCompressSync(content)),
				"index.pack.br"
			)
		).resolves.toEqual(["file-a"]);
	});

	// zstd is only available on Node.js >= 22.15
	("zstdCompressSync" in zlib ? it : it.skip)(
		"supports zstd compressed files",
		async () => {
			const content = buildFile(["file-a"]);
			await expect(
				getReferencedFilenames(
					fsWithFile(zlib.zstdCompressSync(content)),
					"index.pack.zst"
				)
			).resolves.toEqual(["file-a"]);
		}
	);

	it("rejects on version mismatch", async () => {
		const content = buildFile(["file-a"]);
		content.writeUInt32LE(0, 0);
		await expect(
			getReferencedFilenames(fsWithFile(content), "index.pack")
		).rejects.toThrow(/Invalid file version/);
	});

	it("rejects on read errors", async () => {
		const fs = /** @type {EXPECTED_ANY} */ ({
			readFile: (
				/** @type {string} */ _file,
				/** @type {(err: Error | null) => void} */ callback
			) => callback(new Error("read failed")),
			open: (
				/** @type {string} */ _file,
				/** @type {string} */ _flags,
				/** @type {(err: Error | null) => void} */ callback
			) => callback(new Error("open failed"))
		});
		await expect(getReferencedFilenames(fs, "index.pack")).rejects.toThrow(
			/open failed/
		);
		await expect(getReferencedFilenames(fs, "index.pack.gz")).rejects.toThrow(
			/read failed/
		);
	});

	it("rejects when the section table does not match the file size", async () => {
		const content = buildFile([Buffer.from([1, 2, 3]), "file-a"]);
		const fs = /** @type {EXPECTED_ANY} */ (fsWithFile(content));
		// the table sums to fewer bytes than the file actually has
		fs.stat = (
			/** @type {string} */ _file,
			/** @type {EXPECTED_ANY} */ callback
		) => process.nextTick(() => callback(null, { size: content.length + 10 }));
		await expect(getReferencedFilenames(fs, "index.pack")).rejects.toThrow(
			/Section table does not match size/
		);
	});

	it("rejects when stat errors", async () => {
		const content = buildFile([Buffer.from([1, 2, 3]), "file-a"]);
		const fs = /** @type {EXPECTED_ANY} */ (fsWithFile(content));
		fs.stat = (
			/** @type {string} */ _file,
			/** @type {EXPECTED_ANY} */ callback
		) => process.nextTick(() => callback(new Error("stat failed")));
		await expect(getReferencedFilenames(fs, "index.pack")).rejects.toThrow(
			/stat failed/
		);
	});
});
