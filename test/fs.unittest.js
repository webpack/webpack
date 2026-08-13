"use strict";

const { mkdirp, mkdirpSync } = require("../lib/util/fs");

/** @typedef {import("../lib/util/fs").IntermediateFileSystem} IntermediateFileSystem */
/** @typedef {import("../lib/util/fs").OutputFileSystem} OutputFileSystem */

/**
 * @typedef {object} FakeFs
 * @property {string[]} created the directories that were created, in order
 * @property {(p: string, callback: (err?: NodeJS.ErrnoException) => void) => void} mkdir async mkdir
 * @property {(p: string) => void} mkdirSync sync mkdir
 */

/**
 * @param {string} code the error code
 * @param {string} p the path mkdir was called with
 * @returns {NodeJS.ErrnoException} an error carrying that code
 */
const createError = (code, p) => {
	const err = /** @type {NodeJS.ErrnoException} */ (
		new Error(`${code}: mkdir '${p}'`)
	);
	err.code = code;
	return err;
};

/**
 * A file system whose mkdir never reports success: a directory whose parent is
 * missing gets ENOENT, every other one gets `existingCode` — what memfs/BSD do
 * for an existing directory such as the root "/" (#10544), and what a
 * concurrent creation looks like on the retry after the recursion.
 * @param {string} existingCode the code reported instead of success
 * @returns {FakeFs} the file system
 */
const createFs = (existingCode) => {
	const dirs = new Set(["/"]);
	/** @type {string[]} */
	const created = [];
	/**
	 * @param {string} p the directory to create
	 * @returns {NodeJS.ErrnoException} the reported error
	 */
	const mkdir = (p) => {
		const parent = p.slice(0, p.lastIndexOf("/")) || "/";
		if (!dirs.has(parent)) return createError("ENOENT", p);
		if (!dirs.has(p)) {
			dirs.add(p);
			created.push(p);
		}
		return createError(existingCode, p);
	};
	return {
		created,
		mkdir: (p, callback) => {
			const err = mkdir(p);
			process.nextTick(() => callback(err));
		},
		mkdirSync: (p) => {
			throw mkdir(p);
		}
	};
};

/**
 * @param {string} code the code every mkdir fails with
 * @returns {FakeFs} a file system on which mkdir always fails
 */
const createBrokenFs = (code) => ({
	created: [],
	mkdir: (p, callback) => {
		process.nextTick(() => callback(createError(code, p)));
	},
	mkdirSync: (p) => {
		throw createError(code, p);
	}
});

/** @type {[string, (fs: FakeFs, p: string) => Promise<void>][]} */
const IMPLEMENTATIONS = [
	[
		"mkdirp",
		(fs, p) =>
			new Promise((resolve, reject) => {
				mkdirp(
					/** @type {OutputFileSystem} */ (/** @type {unknown} */ (fs)),
					p,
					(err) => {
						if (err) reject(err);
						else resolve();
					}
				);
			})
	],
	[
		"mkdirpSync",
		async (fs, p) => {
			mkdirpSync(
				/** @type {IntermediateFileSystem} */ (/** @type {unknown} */ (fs)),
				p
			);
		}
	]
];

describe("util/fs", () => {
	for (const [name, run] of IMPLEMENTATIONS) {
		describe(name, () => {
			for (const code of ["EEXIST", "EISDIR"]) {
				it(`creates every missing directory when mkdir reports ${code} instead of success`, async () => {
					const fs = createFs(code);

					await run(fs, "/a/b/c");

					expect(fs.created).toEqual(["/a", "/a/b", "/a/b/c"]);
				});

				it(`succeeds when the directory exists and mkdir reports ${code}`, async () => {
					const fs = createFs(code);

					await run(fs, "/");

					expect(fs.created).toEqual([]);
				});
			}

			it("propagates an unrelated mkdir error", async () => {
				await expect(
					run(createBrokenFs("EACCES"), "/a/b")
				).rejects.toMatchObject({ code: "EACCES" });
			});

			it("propagates ENOENT when not even the root can be created", async () => {
				await expect(
					run(createBrokenFs("ENOENT"), "/a/b")
				).rejects.toMatchObject({ code: "ENOENT" });
			});
		});
	}
});
