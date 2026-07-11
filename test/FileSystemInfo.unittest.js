"use strict";

/** @typedef {import("../lib/FileSystemInfo").Snapshot} Snapshot */
/** @typedef {import("../lib/FileSystemInfo").SnapshotOptions} SnapshotOptions */
/** @typedef {import("../lib/errors/WebpackError")} WebpackError */
/** @typedef {import("memfs").IFs} IFs */

const util = require("util");
const { Volume, createFsFromVolume } = require("memfs");
const FileSystemInfo = require("../lib/FileSystemInfo");
const { buffersSerializer } = require("../lib/util/serialization");

describe("FileSystemInfo", () => {
	afterEach(() => {
		// restore the spy created with spyOn
		jest.restoreAllMocks();
	});

	const files = [
		"/path/file.txt",
		"/path/nested/deep/file.txt",
		"/path/nested/deep/ignored.txt",
		"/path/context+files/file.txt",
		"/path/context+files/sub/file.txt",
		"/path/context+files/sub/ignored.txt",
		"/path/node_modules/package/file.txt",
		"/path/cache/package-1234/file.txt",
		"/path/circular/circular/file2.txt",
		"/path/nested/deep/symlink/file.txt",
		"/path/context+files/sub/symlink/file.txt",
		"/path/context/sub/symlink/file.txt",
		"/path/missing.txt",
		"/path/node_modules/@foo/package1/index.js",
		"/path/node_modules/@foo/package2/index.js",
		"/path/node_modules/bar-package3/index.js"
	];
	const directories = [
		"/path/context+files",
		"/path/context",
		"/path/missing",
		"/path/node_modules/package",
		"/path/node_modules/missing",
		"/path/node_modules/@foo",
		"/path/node_modules/@foo/package1",
		"/path/node_modules/@foo/package2",
		"/path/node_modules/bar-package3",
		"/path/cache/package-1234",
		"/path/cache/package-missing"
	];
	const missing = [
		"/path/package.json",
		"/path/file2.txt",
		"/path/context+files/file2.txt",
		"/path/node_modules/package.txt",
		"/path/node_modules/package/missing.txt",
		"/path/cache/package-2345",
		"/path/cache/package-1234/missing.txt",
		"/path/ignored.txt"
	];
	const ignored = [
		"/path/nested/deep/ignored.txt",
		"/path/context+files/sub/ignored.txt",
		"/path/context/sub/ignored.txt",
		"/path/ignored.txt",
		"/path/node_modules/package/ignored.txt",
		"/path/cache/package-1234/ignored.txt"
	];
	const unmanagedPaths = [
		"/path/node_modules/@foo/package1",
		"/path/node_modules/@foo/package2",
		"/path/node_modules/bar-package3"
	];
	const managedPaths = ["/path/node_modules"];
	const immutablePaths = ["/path/cache"];
	const createFs = () => {
		const fs = createFsFromVolume(new Volume());
		fs.mkdirSync("/path/context+files/sub", { recursive: true });
		fs.mkdirSync("/path/context/sub", { recursive: true });
		fs.mkdirSync("/path/nested/deep", { recursive: true });
		fs.mkdirSync("/path/node_modules/package", { recursive: true });
		fs.mkdirSync("/path/node_modules/@foo", { recursive: true });
		fs.mkdirSync("/path/node_modules/@foo/package1", { recursive: true });
		fs.mkdirSync("/path/node_modules/@foo/package2", { recursive: true });
		fs.mkdirSync("/path/node_modules/bar-package3", { recursive: true });
		fs.mkdirSync("/path/cache/package-1234", { recursive: true });
		fs.mkdirSync("/path/folder/context", { recursive: true });
		fs.mkdirSync("/path/folder/context+files", { recursive: true });
		fs.mkdirSync("/path/folder/nested", { recursive: true });
		fs.writeFileSync("/path/file.txt", "Hello World");
		fs.writeFileSync("/path/file2.txt", "Hello World2");
		fs.writeFileSync("/path/nested/deep/file.txt", "Hello World");
		fs.writeFileSync("/path/nested/deep/ignored.txt", "Ignored");
		fs.writeFileSync("/path/context+files/file.txt", "Hello World");
		fs.writeFileSync("/path/context+files/file2.txt", "Hello World2");
		fs.writeFileSync("/path/context+files/sub/file.txt", "Hello World");
		fs.writeFileSync("/path/context+files/sub/file2.txt", "Hello World2");
		fs.writeFileSync("/path/context+files/sub/file3.txt", "Hello World3");
		fs.writeFileSync("/path/context+files/sub/ignored.txt", "Ignored");
		fs.writeFileSync("/path/context/file.txt", "Hello World");
		fs.writeFileSync("/path/context/file2.txt", "Hello World2");
		fs.writeFileSync("/path/context/sub/file.txt", "Hello World");
		fs.writeFileSync("/path/context/sub/file2.txt", "Hello World2");
		fs.writeFileSync("/path/context/sub/file3.txt", "Hello World3");
		fs.writeFileSync("/path/context/sub/ignored.txt", "Ignored");
		fs.writeFileSync(
			"/path/node_modules/package/package.json",
			JSON.stringify({ name: "package", version: "1.0.0" })
		);
		fs.writeFileSync("/path/node_modules/package/file.txt", "Hello World");
		fs.writeFileSync("/path/node_modules/package/ignored.txt", "Ignored");
		fs.writeFileSync(
			"/path/cache/package-1234/package.json",
			JSON.stringify({ name: "package", version: "1.0.0" })
		);
		fs.writeFileSync("/path/cache/package-1234/file.txt", "Hello World");
		fs.writeFileSync("/path/cache/package-1234/ignored.txt", "Ignored");
		fs.symlinkSync("/path", "/path/circular", "dir");
		fs.writeFileSync("/path/folder/context/file.txt", "Hello World");
		fs.writeFileSync("/path/folder/context+files/file.txt", "Hello World");
		fs.writeFileSync("/path/folder/nested/file.txt", "Hello World");
		fs.writeFileSync(
			"/path/node_modules/@foo/package1/index.js",
			"Hello World"
		);
		fs.writeFileSync(
			"/path/node_modules/@foo/package2/index.js",
			"Hello World"
		);
		fs.writeFileSync("/path/node_modules/bar-package3/index.js", "Hello World");
		fs.symlinkSync("/path/folder/context", "/path/context/sub/symlink", "dir");
		fs.symlinkSync(
			"/path/folder/context+files",
			"/path/context+files/sub/symlink",
			"dir"
		);
		fs.symlinkSync("/path/folder/nested", "/path/nested/deep/symlink", "dir");
		return fs;
	};

	const createFsInfo = (/** @type {IFs} */ fs) => {
		/** @type {import("../lib/logging/Logger").Logger & Record<string, (...args: unknown[]) => unknown>} */
		const logger =
			/** @type {import("../lib/logging/Logger").Logger & Record<string, (...args: unknown[]) => unknown>} */ (
				/** @type {unknown} */ ({
					error: (/** @type {unknown[]} */ ...args) => {
						throw new Error(util.format(...args));
					}
				})
			);
		/** @type {import("../lib/FileSystemInfo") & Record<string, unknown>} */
		const fsInfo =
			/** @type {import("../lib/FileSystemInfo") & Record<string, unknown>} */ (
				new FileSystemInfo(
					/** @type {import("../lib/util/fs").InputFileSystem} */ (
						/** @type {unknown} */ (fs)
					),
					{
						logger,
						unmanagedPaths,
						managedPaths,
						immutablePaths,
						hashFunction: "sha256"
					}
				)
			);
		for (const method of ["warn", "info", "log", "debug"]) {
			fsInfo.logs = [];
			fsInfo[method] = [];
			logger[method] = (/** @type {unknown[]} */ ...args) => {
				const msg = util.format(...args);
				/** @type {string[]} */ (fsInfo[method]).push(msg);
				/** @type {string[]} */ (fsInfo.logs).push(`[${method}] ${msg}`);
			};
		}
		fsInfo.addFileTimestamps(new Map(ignored.map((i) => [i, "ignore"])));
		return fsInfo;
	};

	const createSnapshot = (
		/** @type {IFs} */ fs,
		/** @type {SnapshotOptions} */ options,
		/** @type {(err?: Error | null, snapshot?: Snapshot | null, snapshot2?: Snapshot | null) => void} */ callback
	) => {
		const fsInfo = createFsInfo(fs);
		fsInfo.createSnapshot(
			Date.now() + 10000,
			files,
			directories,
			missing,
			options,
			(err, snapshot) => {
				if (err) return callback(err);
				/** @type {Snapshot & Record<string, unknown>} */ (snapshot).name =
					"initial snapshot";
				// create another one to test the caching
				fsInfo.createSnapshot(
					Date.now() + 10000,
					files,
					directories,
					missing,
					options,
					(err, snapshot2) => {
						if (err) return callback(err);
						/** @type {Snapshot & Record<string, unknown>} */ (snapshot2).name =
							"cached snapshot";
						callback(null, snapshot, snapshot2);
					}
				);
			}
		);
	};

	const clone = (/** @type {Record<string, unknown>} */ object) => {
		const serialized = buffersSerializer.serialize(object, {});
		return buffersSerializer.deserialize(serialized, {});
	};

	const expectSnapshotsState = (
		/** @type {IFs} */ fs,
		/** @type {Snapshot | null | undefined} */ snapshot,
		/** @type {Snapshot | null | undefined} */ snapshot2,
		/** @type {boolean} */ expected,
		/** @type {(err?: Error | null) => void} */ callback
	) => {
		expectSnapshotState(fs, snapshot, expected, (err) => {
			if (err) return callback(err);
			if (!snapshot2) return callback();
			expectSnapshotState(fs, snapshot2, expected, callback);
		});
	};

	const expectSnapshotState = (
		/** @type {IFs} */ fs,
		/** @type {Snapshot | null | undefined} */ snapshot,
		/** @type {boolean} */ expected,
		/** @type {(err?: Error | null) => void} */ callback
	) => {
		const fsInfo = createFsInfo(fs);
		const details = (/** @type {unknown} */ snapshot) => `${
			/** @type {string[]} */ (
				/** @type {Record<string, unknown>} */ (fsInfo).logs
			).join("\n")
		}
${util.inspect(snapshot, false, Infinity, true)}`;
		fsInfo.checkSnapshotValid(
			/** @type {Snapshot} */ (snapshot),
			(err, valid) => {
				if (err) return callback(err);
				if (valid !== expected) {
					return callback(
						new Error(`Expected snapshot to be ${
							expected ? "valid" : "invalid"
						} but it is ${valid ? "valid" : "invalid"}:
${details(snapshot)}`)
					);
				}
				// Another try to check if direct caching works
				fsInfo.checkSnapshotValid(
					/** @type {Snapshot} */ (snapshot),
					(err, valid) => {
						if (err) return callback(err);
						if (valid !== expected) {
							return callback(
								new Error(`Expected snapshot lead to the same result when directly cached:
${details(snapshot)}`)
							);
						}
						// Another try to check if indirect caching works
						fsInfo.checkSnapshotValid(
							/** @type {Snapshot} */ (
								/** @type {unknown} */ (
									clone(
										/** @type {Record<string, unknown>} */ (
											/** @type {unknown} */ (snapshot)
										)
									)
								)
							),
							(err, valid) => {
								if (err) return callback(err);
								if (valid !== expected) {
									return callback(
										new Error(`Expected snapshot lead to the same result when indirectly cached:
${details(snapshot)}`)
									);
								}
								callback();
							}
						);
					}
				);
			}
		);
	};

	const updateFile = (
		/** @type {IFs} */ fs,
		/** @type {string} */ filename
	) => {
		const oldContent = /** @type {string} */ (
			/** @type {unknown} */ (fs.readFileSync(filename, "utf8"))
		);
		if (filename.endsWith(".json")) {
			const data = JSON.parse(oldContent);
			fs.writeFileSync(
				filename,
				JSON.stringify({
					...data,
					version: `${data.version}.1`
				})
			);
		} else {
			fs.writeFileSync(filename, `${oldContent}!`);
		}
	};

	for (const [name, options] of /** @type {[string, SnapshotOptions][]} */ ([
		["timestamp", { timestamp: true }],
		["hash", { hash: true }],
		["tsh", { timestamp: true, hash: true }]
	])) {
		describe(`${name} mode`, () => {
			it("should always accept an empty snapshot", (done) => {
				const fs = createFs();
				const fsInfo = createFsInfo(fs);
				fsInfo.createSnapshot(
					Date.now() + 10000,
					[],
					[],
					[],
					options,
					(err, snapshot) => {
						if (err) return done(err);
						const fs = createFs();
						expectSnapshotState(fs, snapshot, true, done);
					}
				);
			});

			it("should accept a snapshot when fs is unchanged", (done) => {
				const fs = createFs();
				createSnapshot(fs, options, (err, snapshot, snapshot2) => {
					if (err) return done(err);
					expectSnapshotsState(fs, snapshot, snapshot2, true, done);
				});
			});

			const ignoredFileChanges = [
				"/path/nested/deep/ignored.txt",
				"/path/context+files/sub/ignored.txt"
			];

			for (const fileChange of [
				"/path/file.txt",
				"/path/file2.txt",
				"/path/nested/deep/file.txt",
				"/path/context+files/file.txt",
				"/path/context+files/file2.txt",
				"/path/context+files/sub/file.txt",
				"/path/context+files/sub/file2.txt",
				"/path/context+files/sub/file3.txt",
				"/path/context/file.txt",
				"/path/context/file2.txt",
				"/path/context/sub/file.txt",
				"/path/context/sub/file2.txt",
				"/path/context/sub/file3.txt",
				"/path/node_modules/package/package.json",
				"/path/folder/context/file.txt",
				"/path/folder/context+files/file.txt",
				"/path/folder/nested/file.txt",
				"/path/node_modules/@foo/package1/index.js",
				"/path/node_modules/@foo/package2/index.js",
				"/path/node_modules/bar-package3/index.js",
				...(name !== "timestamp" ? ignoredFileChanges : []),
				...(name === "hash" ? ["/path/context/sub/ignored.txt"] : [])
			]) {
				it(`should invalidate the snapshot when ${fileChange} is changed`, (done) => {
					const fs = createFs();
					createSnapshot(fs, options, (err, snapshot, snapshot2) => {
						if (err) return done(err);
						updateFile(fs, fileChange);
						expectSnapshotsState(fs, snapshot, snapshot2, false, done);
					});
				});
			}

			for (const fileChange of [
				"/path/node_modules/package/file.txt",
				"/path/node_modules/package/ignored.txt",
				"/path/cache/package-1234/package.json",
				"/path/cache/package-1234/file.txt",
				"/path/cache/package-1234/ignored.txt",
				...(name === "timestamp" ? ignoredFileChanges : []),
				...(name !== "hash" ? ["/path/context/sub/ignored.txt"] : [])
			]) {
				it(`should not invalidate the snapshot when ${fileChange} is changed`, (done) => {
					const fs = createFs();
					createSnapshot(fs, options, (err, snapshot, snapshot2) => {
						if (err) return done(err);
						updateFile(fs, fileChange);
						expectSnapshotsState(fs, snapshot, snapshot2, true, done);
					});
				});
			}

			for (const newFile of [
				"/path/package.json",
				"/path/file2.txt",
				"/path/context+files/file2.txt",
				"/path/node_modules/package.txt"
			]) {
				it(`should invalidate the snapshot when ${newFile} is created`, (done) => {
					const fs = createFs();
					createSnapshot(fs, options, (err, snapshot, snapshot2) => {
						if (err) return done(err);
						fs.writeFileSync(newFile, "New file");
						expectSnapshotsState(fs, snapshot, snapshot2, false, done);
					});
				});
			}

			for (const newFile of [
				"/path/node_modules/package/missing.txt",
				"/path/cache/package-1234/missing.txt",
				"/path/cache/package-2345",
				"/path/ignored.txt"
			]) {
				it(`should not invalidate the snapshot when ${newFile} is created`, (done) => {
					const fs = createFs();
					createSnapshot(fs, options, (err, snapshot, snapshot2) => {
						if (err) return done(err);
						fs.writeFileSync(newFile, "New file");
						expectSnapshotsState(fs, snapshot, snapshot2, true, done);
					});
				});
			}

			if (name !== "timestamp") {
				it("should not invalidate snapshot when only timestamps have changed", (done) => {
					const fs = createFs();
					createSnapshot(fs, options, (err, snapshot, snapshot2) => {
						if (err) return done(err);
						const fs = createFs();
						expectSnapshotsState(fs, snapshot, snapshot2, true, done);
					});
				});
			}
		});
	}

	describe("stable iterables identity", () => {
		const options = { timestamp: true };

		/**
		 * @param {(err?: WebpackError | null, snapshot?: Snapshot | null) => void} callback callback function
		 */
		function getSnapshot(callback) {
			const fs = createFs();
			const fsInfo = createFsInfo(fs);
			fsInfo.createSnapshot(
				Date.now() + 10000,
				files,
				directories,
				missing,
				options,
				callback
			);
		}

		it("should return same iterable for getFileIterable()", (done) => {
			getSnapshot((err, snapshot) => {
				if (err) done(err);
				expect(/** @type {Snapshot} */ (snapshot).getFileIterable()).toEqual(
					/** @type {Snapshot} */ (snapshot).getFileIterable()
				);
				done();
			});
		});

		it("should return same iterable for getContextIterable()", (done) => {
			getSnapshot((err, snapshot) => {
				if (err) done(err);
				expect(/** @type {Snapshot} */ (snapshot).getContextIterable()).toEqual(
					/** @type {Snapshot} */ (snapshot).getContextIterable()
				);
				done();
			});
		});

		it("should return same iterable for getMissingIterable()", (done) => {
			getSnapshot((err, snapshot) => {
				if (err) done(err);
				expect(/** @type {Snapshot} */ (snapshot).getFileIterable()).toEqual(
					/** @type {Snapshot} */ (snapshot).getFileIterable()
				);
				done();
			});
		});
	});

	describe("symlinks", () => {
		it("should work with symlinks with errors", (done) => {
			const fs = createFs();

			fs.symlinkSync(
				"/path/folder/context",
				"/path/context/sub/symlink-error",
				"dir"
			);

			const originalReadlink = fs.readlink;

			let i = 0;

			jest.spyOn(fs, "readlink").mockImplementation((path, callback) => {
				if (path === "/path/context/sub/symlink-error" && i < 2) {
					i += 1;
					/** @type {(err: Error) => void} */ (callback)(new Error("test"));
					return;
				}

				/** @type {(path: string, cb: unknown) => void} */ (originalReadlink)(
					/** @type {string} */ (path),
					callback
				);
			});

			createSnapshot(
				fs,
				/** @type {SnapshotOptions} */ (
					/** @type {unknown} */ (["timestamp", { timestamp: true }])
				),
				(err, snapshot, snapshot2) => {
					if (err) return done(err);
					expectSnapshotsState(fs, snapshot, snapshot2, true, done);
				}
			);
		});

		it("should work with symlinks with errors #1", (done) => {
			const fs = createFs();

			fs.symlinkSync(
				"/path/folder/context",
				"/path/context/sub/symlink-error",
				"dir"
			);

			jest.spyOn(fs, "readlink").mockImplementation((path, callback) => {
				/** @type {(err: Error) => void} */ (callback)(new Error("test"));
			});

			const fsInfo = createFsInfo(fs);
			fsInfo.createSnapshot(
				Date.now() + 10000,
				files,
				directories,
				missing,
				/** @type {SnapshotOptions} */ (
					/** @type {unknown} */ (["timestamp", { timestamp: true }])
				),
				(err, snapshot) => {
					expect(snapshot).toBeNull();
					done();
				}
			);
		});

		// #21084: a cyclic symlink graph (e.g. pnpm peer-variant back-edges) used
		// to re-push already-visited targets forever, overflowing the context
		// queue. The walk must visit each target once and terminate.
		it("should terminate on a cyclic symlink graph", (done) => {
			const fs = createFs();
			fs.mkdirSync("/path/cycle/a", { recursive: true });
			fs.mkdirSync("/path/cycle/b", { recursive: true });
			fs.writeFileSync("/path/cycle/a/file.txt", "Hello A");
			fs.writeFileSync("/path/cycle/b/file.txt", "Hello B");
			// Relative targets, matching pnpm's symlink layout, so they resolve
			// back into the cycle instead of being mangled by `join`.
			fs.symlinkSync("../b", "/path/cycle/a/link", "dir");
			fs.symlinkSync("../a", "/path/cycle/b/link", "dir");

			const fsInfo = createFsInfo(fs);
			fsInfo.getContextHash("/path/cycle/a", (err, hash) => {
				if (err) return done(err);
				expect(typeof hash).toBe("string");
				done();
			});
		});
	});

	// Reproduces the type-lie discussed in webpack/webpack#16886:
	// `addFileTimestamps`/`addContextTimestamps` accept watchpack-style
	// `ExistenceOnlyTimeEntry` (`{}`) values, but the cached entries used to
	// be compared directly against snapshots that include a `timestamp` /
	// `timestampHash`. Cache lookups now treat existence-only entries as a
	// cache miss and re-read from disk so snapshots stay valid.
	describe("existence-only watchpack entries", () => {
		const buildFsInfoWithSnapshot = (
			/** @type {(err?: Error | null, fs?: IFs, snapshot?: Snapshot | null) => void} */ callback
		) => {
			const fs = createFs();
			const fsInfo = createFsInfo(fs);
			fsInfo.createSnapshot(
				Date.now() + 10000,
				files,
				directories,
				missing,
				/** @type {SnapshotOptions} */ (
					/** @type {unknown} */ (["timestamp", { timestamp: true }])
				),
				(err, snapshot) => {
					if (err) return callback(err);
					callback(null, fs, snapshot);
				}
			);
		};

		const onlyNonIgnored = (/** @type {string[]} */ paths) =>
			paths.filter((/** @type {string} */ p) => !ignored.includes(p));

		it("keeps the snapshot valid when watchpack reports `{}` for context dirs", (done) => {
			buildFsInfoWithSnapshot((err, fs, snapshot) => {
				if (err) return done(err);
				const fsInfo = createFsInfo(/** @type {IFs} */ (fs));
				const map = new Map(directories.map((d) => [d, {}]));
				fsInfo.addContextTimestamps(map, true);
				fsInfo.checkSnapshotValid(
					/** @type {Snapshot} */ (snapshot),
					(err, valid) => {
						if (err) return done(err);
						expect(valid).toBe(true);
						done();
					}
				);
			});
		});

		it("keeps the snapshot valid when watchpack reports `{}` for files", (done) => {
			buildFsInfoWithSnapshot((err, fs, snapshot) => {
				if (err) return done(err);
				const fsInfo = createFsInfo(/** @type {IFs} */ (fs));
				const map = new Map(onlyNonIgnored(files).map((f) => [f, {}]));
				fsInfo.addFileTimestamps(map, true);
				fsInfo.checkSnapshotValid(
					/** @type {Snapshot} */ (snapshot),
					(err, valid) => {
						if (err) return done(err);
						expect(valid).toBe(true);
						done();
					}
				);
			});
		});

		it("keeps the snapshot valid when watchpack reports `{ safeTime }` (no timestampHash) for an existing context dir", (done) => {
			buildFsInfoWithSnapshot((err, fs, snapshot) => {
				if (err) return done(err);
				const fsInfo = createFsInfo(/** @type {IFs} */ (fs));
				// Only target existing directories — for missing ones the cache
				// would claim the dir exists while the snapshot says it doesn't.
				fsInfo.addContextTimestamps(
					new Map([["/path/context+files", { safeTime: 1 }]]),
					true
				);
				fsInfo.checkSnapshotValid(
					/** @type {Snapshot} */ (snapshot),
					(err, valid) => {
						if (err) return done(err);
						expect(valid).toBe(true);
						done();
					}
				);
			});
		});

		it("invalidates the snapshot when watchpack `safeTime` is newer than snapshot start", (done) => {
			const fs = createFs();
			const fsInfo = createFsInfo(fs);
			const startTime = Date.now() - 1000;
			fsInfo.createSnapshot(
				startTime,
				files,
				directories,
				missing,
				/** @type {SnapshotOptions} */ (
					/** @type {unknown} */ (["timestamp", { timestamp: true }])
				),
				(err, snapshot) => {
					if (err) return done(err);
					const fsInfo2 = createFsInfo(fs);
					fsInfo2.addContextTimestamps(
						new Map([["/path/context+files", { safeTime: startTime + 5000 }]]),
						true
					);
					fsInfo2.checkSnapshotValid(
						/** @type {Snapshot} */ (snapshot),
						(err, valid) => {
							if (err) return done(err);
							expect(valid).toBe(false);
							done();
						}
					);
				}
			);
		});

		it("getContextTimestamp falls back to disk read when cache is `{}`", (done) => {
			const fs = createFs();
			const fsInfo = createFsInfo(fs);
			const dir = "/path/context+files";
			fsInfo.addContextTimestamps(new Map([[dir, {}]]), true);
			fsInfo.getContextTimestamp(dir, (err, entry) => {
				if (err) return done(err);
				expect(entry).toBeTruthy();
				expect(entry).not.toBe("ignore");
				expect(entry).toHaveProperty("timestampHash");
				done();
			});
		});

		it("getFileTimestamp falls back to disk read when cache is `{}`", (done) => {
			const fs = createFs();
			const fsInfo = createFsInfo(fs);
			const file = "/path/file.txt";
			fsInfo.addFileTimestamps(new Map([[file, {}]]), true);
			fsInfo.getFileTimestamp(file, (err, entry) => {
				if (err) return done(err);
				expect(entry).toBeTruthy();
				expect(entry).not.toBe("ignore");
				expect(entry).toHaveProperty("timestamp");
				done();
			});
		});

		it("keeps the snapshot valid when watchpack reports `{}` for a missing dependency that is still missing", (done) => {
			const fs = createFs();
			const fsInfo = createFsInfo(fs);
			fsInfo.createSnapshot(
				Date.now() + 10000,
				files,
				directories,
				missing,
				/** @type {SnapshotOptions} */ (
					/** @type {unknown} */ (["timestamp", { timestamp: true }])
				),
				(err, snapshot) => {
					if (err) return done(err);
					const fsInfo2 = createFsInfo(fs);
					// Pretend watchpack reports an existence-only entry for a
					// missing dep. The fix must treat this as "no info" and
					// re-stat the file, observing that it still doesn't exist.
					fsInfo2.addFileTimestamps(
						new Map([["/path/package.json", {}]]),
						true
					);
					fsInfo2.checkSnapshotValid(
						/** @type {Snapshot} */ (snapshot),
						(err, valid) => {
							if (err) return done(err);
							expect(valid).toBe(true);
							done();
						}
					);
				}
			);
		});

		it("invalidates the snapshot when a previously-missing dep now exists", (done) => {
			const fs = createFs();
			const fsInfo = createFsInfo(fs);
			fsInfo.createSnapshot(
				Date.now() + 10000,
				files,
				directories,
				missing,
				/** @type {SnapshotOptions} */ (
					/** @type {unknown} */ (["timestamp", { timestamp: true }])
				),
				(err, snapshot) => {
					if (err) return done(err);
					// Create the missing file and re-check.
					fs.writeFileSync("/path/package.json", "{}");
					const fsInfo2 = createFsInfo(fs);
					fsInfo2.checkSnapshotValid(
						/** @type {Snapshot} */ (snapshot),
						(err, valid) => {
							if (err) return done(err);
							expect(valid).toBe(false);
							done();
						}
					);
				}
			);
		});

		it("getContextTimestamp returns `ignore` for an ignored context dir", (done) => {
			const fs = createFs();
			const fsInfo = createFsInfo(fs);
			const dir = "/path/context+files";
			fsInfo.addContextTimestamps(new Map([[dir, "ignore"]]), true);
			fsInfo.getContextTimestamp(dir, (err, entry) => {
				if (err) return done(err);
				expect(entry).toBe("ignore");
				done();
			});
		});

		it("snapshot creation re-reads disk when cache for a context dir lacks `timestampHash`", (done) => {
			const fs = createFs();
			const fsInfo = createFsInfo(fs);
			// Pre-populate the cache with a watchpack-style `{ safeTime }`
			// entry (no `timestampHash`). Without re-reading disk during
			// snapshot creation, the snapshot would be stored without a
			// `timestampHash` and could miss directory-change detection on
			// subsequent validations.
			fsInfo.addContextTimestamps(
				new Map([["/path/context+files", { safeTime: 1 }]]),
				true
			);
			fsInfo.createSnapshot(
				Date.now() + 10000,
				files,
				directories,
				missing,
				/** @type {SnapshotOptions} */ (
					/** @type {unknown} */ (["timestamp", { timestamp: true }])
				),
				(err, snapshot) => {
					if (err) return done(err);
					const stored = /** @type {Map<string, EXPECTED_ANY>} */ (
						/** @type {Snapshot} */ (snapshot).contextTimestamps
					).get("/path/context+files");
					expect(stored).toBeTruthy();
					expect(stored).toHaveProperty("timestampHash");
					done();
				}
			);
		});

		// #21378: `_resolveContextTimestamp` walks symlink targets via
		// `_getUnresolvedContextTimestamp`. Watchpack rebuild entries carry
		// `{ safeTime, timestamp }` but never `timestampHash`; returning
		// them for a symlink target makes the hash walk crash. Relative
		// symlink targets (pnpm-style) resolve to the real directory path.
		it("checkSnapshotValid resolves context dirs with symlinks when watchpack reports `{ safeTime, timestamp }` for the symlink target (#21378)", (done) => {
			const fs = createFsFromVolume(new Volume());
			const ctxDir = "/root/ctx";
			const realDir = "/root/real";
			const realSubDir = "/root/real/sub";
			fs.mkdirSync(`${ctxDir}/sub`, { recursive: true });
			fs.mkdirSync(realSubDir, { recursive: true });
			fs.writeFileSync(`${realSubDir}/a.txt`, "hello");
			fs.writeFileSync(`${ctxDir}/index.txt`, "x");
			fs.symlinkSync("../real", `${ctxDir}/link`, "dir");
			const contextDirs = [ctxDir, realDir, realSubDir];
			const fsInfo = createFsInfo(fs);
			fsInfo.createSnapshot(
				Date.now() + 10000,
				[],
				contextDirs,
				[],
				/** @type {SnapshotOptions} */ (
					/** @type {unknown} */ (["timestamp", { timestamp: true }])
				),
				(err, snapshot) => {
					if (err) return done(err);
					const ctxSnap = /** @type {Map<string, EXPECTED_ANY>} */ (
						/** @type {Snapshot} */ (snapshot).contextTimestamps
					).get(ctxDir);
					const fsInfo2 = createFsInfo(fs);
					// Rebuild: watchpack supplies `{ safeTime, timestamp }` for
					// context dirs but never `timestampHash`.
					fsInfo2.addContextTimestamps(
						new Map([
							[ctxDir, { safeTime: ctxSnap.safeTime }],
							[
								realDir,
								{ safeTime: ctxSnap.safeTime, timestamp: ctxSnap.safeTime }
							],
							[
								realSubDir,
								{ safeTime: ctxSnap.safeTime, timestamp: ctxSnap.safeTime }
							]
						]),
						true
					);
					fsInfo2.checkSnapshotValid(
						/** @type {Snapshot} */ (snapshot),
						(err, valid) => {
							if (err) return done(err);
							expect(valid).toBe(true);
							done();
						}
					);
				}
			);
		});
	});

	// A context directory tracked when the snapshot was created can become
	// ignored later (e.g. `managedPaths` changed between builds). The
	// `cache === "ignore"` branches must then both skip the directory while
	// creating a snapshot and keep an existing snapshot valid even when the
	// directory's contents changed.
	describe("ignored context entries", () => {
		const ignoredDir = "/path/context+files";
		// Only this captured directory hashes the file below, so changing it
		// isolates the context check from the per-file checks.
		const changedFile = "/path/context+files/sub/file3.txt";

		for (const [name, options] of /** @type {[string, SnapshotOptions][]} */ ([
			["timestamp", { timestamp: true }],
			["tsh", { timestamp: true, hash: true }]
		])) {
			it(`keeps the snapshot valid when a tracked context dir becomes ignored (${name})`, (done) => {
				const fs = createFs();
				const fsInfo = createFsInfo(fs);
				fsInfo.createSnapshot(
					Date.now() + 10000,
					files,
					directories,
					missing,
					options,
					(err, snapshot) => {
						if (err) return done(err);
						updateFile(fs, changedFile);
						// Sanity: without ignoring, the change invalidates the snapshot.
						const control = createFsInfo(fs);
						control.checkSnapshotValid(
							/** @type {Snapshot} */ (snapshot),
							(err, valid) => {
								if (err) return done(err);
								expect(valid).toBe(false);
								// Mark the directory ignored: the snapshot stays valid.
								const fsInfo2 = createFsInfo(fs);
								fsInfo2.addContextTimestamps(
									new Map([[ignoredDir, "ignore"]]),
									true
								);
								fsInfo2.checkSnapshotValid(
									/** @type {Snapshot} */ (snapshot),
									(err, valid) => {
										if (err) return done(err);
										expect(valid).toBe(true);
										done();
									}
								);
							}
						);
					}
				);
			});
		}

		it("omits ignored context dirs from a fresh snapshot", (done) => {
			const fs = createFs();
			const fsInfo = createFsInfo(fs);
			fsInfo.addContextTimestamps(new Map([[ignoredDir, "ignore"]]), true);
			fsInfo.createSnapshot(
				Date.now() + 10000,
				files,
				directories,
				missing,
				{ timestamp: true },
				(err, snapshot) => {
					if (err) return done(err);
					const ts = /** @type {Map<string, EXPECTED_ANY> | undefined} */ (
						/** @type {Snapshot} */ (snapshot).contextTimestamps
					);
					expect(ts === undefined || !ts.has(ignoredDir)).toBe(true);
					done();
				}
			);
		});
	});

	describe("cache maintenance", () => {
		/**
		 * @typedef {import("../lib/FileSystemInfo") & Record<string, unknown>} FsInfoExt
		 * @param {(err: Error | null | undefined, fsInfo?: FsInfoExt) => void} callback result callback
		 */
		const buildWithStats = (
			/** @type {(err: Error | null | undefined, fsInfo?: FsInfoExt) => void} */ callback
		) => {
			const fs = createFs();
			const fsInfo = createFsInfo(fs);
			// Two overlapping snapshots populate the optimization statistics so
			// `logStatistics` exercises its `logWhenMessage` branches.
			fsInfo.createSnapshot(
				Date.now() + 10000,
				files,
				directories,
				missing,
				{ timestamp: true, hash: true },
				(err) => {
					if (err) return callback(err);
					fsInfo.createSnapshot(
						Date.now() + 10000,
						files,
						directories,
						missing,
						{ timestamp: true, hash: true },
						(err) => {
							if (err) return callback(err);
							callback(null, fsInfo);
						}
					);
				}
			);
		};

		it("logStatistics() logs cache and optimization stats", (done) => {
			buildWithStats((err, fsInfo_) => {
				if (err) return done(err);
				const fsInfo = /** @type {FsInfoExt} */ (fsInfo_);
				expect(() => fsInfo.logStatistics()).not.toThrow();
				expect(
					/** @type {string[]} */ (fsInfo.log).some((/** @type {string} */ m) =>
						/new snapshots created/.test(m)
					)
				).toBe(true);
				done();
			});
		});

		it("clear() empties caches and resets stats", (done) => {
			buildWithStats((err, fsInfo_) => {
				if (err) return done(err);
				const fsInfo = /** @type {FsInfoExt} */ (fsInfo_);
				expect(fsInfo._fileTimestamps.size).toBeGreaterThan(0);
				expect(fsInfo._statCreatedSnapshots).toBeGreaterThan(0);
				fsInfo.clear();
				expect(fsInfo._fileTimestamps.size).toBe(0);
				expect(fsInfo._contextTimestamps.size).toBe(0);
				expect(fsInfo._managedItems.size).toBe(0);
				expect(fsInfo._statCreatedSnapshots).toBe(0);
				// stats are empty now, so logStatistics still must not throw
				expect(() => fsInfo.logStatistics()).not.toThrow();
				done();
			});
		});

		it("getDeprecatedFileTimestamps reflects the cache and is memoized", (done) => {
			const fs = createFs();
			const fsInfo = createFsInfo(fs);
			fsInfo.addFileTimestamps(
				new Map([
					["/path/skip.txt", null],
					["/path/ignored.txt", "ignore"]
				])
			);
			fsInfo.getFileTimestamp("/path/file.txt", (err) => {
				if (err) return done(err);
				const map = fsInfo.getDeprecatedFileTimestamps();
				expect(typeof map.get("/path/file.txt")).toBe("number");
				expect(map.get("/path/ignored.txt")).toBeNull();
				expect(map.has("/path/skip.txt")).toBe(false);
				// memoized: same identity on the second call
				expect(fsInfo.getDeprecatedFileTimestamps()).toBe(map);
				done();
			});
		});

		it("getDeprecatedContextTimestamps reflects the cache and is memoized", (done) => {
			const fs = createFs();
			const fsInfo = createFsInfo(fs);
			fsInfo.getContextTimestamp("/path/context", (err) => {
				if (err) return done(err);
				const map = fsInfo.getDeprecatedContextTimestamps();
				expect(map.has("/path/context")).toBe(true);
				expect(fsInfo.getDeprecatedContextTimestamps()).toBe(map);
				done();
			});
		});
	});

	describe("mergeSnapshots", () => {
		it("merges two cached snapshots into a valid cached snapshot", (done) => {
			const fs = createFs();
			const fsInfo = createFsInfo(fs);
			const options = { timestamp: true, hash: true };
			fsInfo.createSnapshot(
				Date.now() + 10000,
				files,
				directories,
				missing,
				options,
				(err, s1) => {
					if (err) return done(err);
					fsInfo.createSnapshot(
						Date.now() + 20000,
						files,
						directories,
						missing,
						options,
						(err, s2) => {
							if (err) return done(err);
							const merged = fsInfo.mergeSnapshots(
								/** @type {Snapshot} */ (s1),
								/** @type {Snapshot} */ (s2)
							);
							expect(merged.startTime).toBe(
								Math.min(
									/** @type {number} */ (
										/** @type {Snapshot} */ (s1).startTime
									),
									/** @type {number} */ (/** @type {Snapshot} */ (s2).startTime)
								)
							);
							// both inputs are cached as valid → so is the merge
							expect(fsInfo._snapshotCache.get(merged)).toBe(true);
							fsInfo.checkSnapshotValid(merged, (err, valid) => {
								if (err) return done(err);
								expect(valid).toBe(true);
								done();
							});
						}
					);
				}
			);
		});

		it("resolves the start time when only one snapshot has one", (done) => {
			const fs = createFs();
			const fsInfo = createFsInfo(fs);
			fsInfo.createSnapshot(
				undefined,
				files,
				[],
				[],
				{ timestamp: true },
				(err, noStart) => {
					if (err) return done(err);
					fsInfo.createSnapshot(
						Date.now() + 10000,
						[],
						directories,
						[],
						{ timestamp: true },
						(err, withStart) => {
							if (err) return done(err);
							expect(/** @type {Snapshot} */ (noStart).hasStartTime()).toBe(
								false
							);
							expect(
								fsInfo.mergeSnapshots(
									/** @type {Snapshot} */ (noStart),
									/** @type {Snapshot} */ (withStart)
								).startTime
							).toBe(/** @type {Snapshot} */ (withStart).startTime);
							expect(
								fsInfo.mergeSnapshots(
									/** @type {Snapshot} */ (withStart),
									/** @type {Snapshot} */ (noStart)
								).startTime
							).toBe(/** @type {Snapshot} */ (withStart).startTime);
							expect(
								fsInfo
									.mergeSnapshots(
										/** @type {Snapshot} */ (noStart),
										/** @type {Snapshot} */ (noStart)
									)
									.hasStartTime()
							).toBe(false);
							done();
						}
					);
				}
			);
		});
	});

	describe("snapshot optimization", () => {
		it("reuses a whole shared snapshot and splits it on partial overlap", (done) => {
			const fs = createFs();
			const fsInfo = createFsInfo(fs);
			// Fixed start time so the shared-snapshot start-time guard always passes.
			const startTime = Date.now() + 10000;
			const make = (
				/** @type {string[]} */ fileList,
				/** @type {(err?: Error | null, snapshot?: Snapshot | null) => void} */ cb
			) =>
				fsInfo.createSnapshot(
					startTime,
					fileList,
					[],
					[],
					{ timestamp: true },
					cb
				);
			// 1st + 2nd identical snapshots create a shared common snapshot.
			make(files, (/** @type {Error | null | undefined} */ err) => {
				if (err) return done(err);
				make(files, (/** @type {Error | null | undefined} */ err) => {
					if (err) return done(err);
					// 3rd identical snapshot reuses the shared snapshot as a whole.
					make(files, (/** @type {Error | null | undefined} */ err) => {
						if (err) return done(err);
						const opt = fsInfo._fileTimestampsOptimization;
						expect(opt._statReusedSharedSnapshots).toBeGreaterThan(0);
						// 4th snapshot shares only part → the shared snapshot is split.
						make(files.slice(0, -2), (err, snapshot) => {
							if (err) return done(err);
							expect(opt._statSharedSnapshots).toBeGreaterThan(0);
							expectSnapshotState(fs, snapshot, true, done);
						});
					});
				});
			});
		});
	});

	describe("resolveBuildDependencies", () => {
		const createProjectFs = () => {
			const fs = createFsFromVolume(new Volume());
			fs.mkdirSync("/proj/node_modules/dep", { recursive: true });
			fs.writeFileSync(
				"/proj/package.json",
				JSON.stringify({
					name: "proj",
					version: "1.0.0",
					dependencies: { dep: "1.0.0" },
					optionalDependencies: { "missing-dep": "1.0.0" }
				})
			);
			fs.mkdirSync("/proj/empty-dir", { recursive: true });
			fs.writeFileSync(
				"/proj/entry.js",
				'import "./lib.mjs";\nimport "dep";\nimport("./dyn.mjs");\n'
			);
			fs.writeFileSync("/proj/lib.mjs", "export const a = 1;\n");
			fs.writeFileSync("/proj/dyn.mjs", "export const b = 2;\n");
			fs.writeFileSync(
				"/proj/node_modules/dep/package.json",
				JSON.stringify({ name: "dep", version: "1.0.0", main: "index.js" })
			);
			fs.writeFileSync(
				"/proj/node_modules/dep/index.js",
				"module.exports = 1;"
			);
			return fs;
		};

		const createProjectFsInfo = (/** @type {IFs} */ fs) => {
			/** @type {import("../lib/logging/Logger").Logger & Record<string, (...args: unknown[]) => unknown>} */
			const logger =
				/** @type {import("../lib/logging/Logger").Logger & Record<string, (...args: unknown[]) => unknown>} */ (
					/** @type {unknown} */ ({
						error: (/** @type {unknown[]} */ ...args) => {
							throw new Error(util.format(...args));
						}
					})
				);
			for (const method of ["warn", "info", "log", "debug"]) {
				logger[method] = () => {};
			}
			return new FileSystemInfo(
				/** @type {import("../lib/util/fs").InputFileSystem} */ (
					/** @type {unknown} */ (fs)
				),
				{ logger, hashFunction: "sha256" }
			);
		};

		it("collects files, directories and resolve results across cjs/esm", (done) => {
			const fs = createProjectFs();
			const fsInfo = createProjectFsInfo(fs);
			fsInfo.resolveBuildDependencies(
				"/proj",
				["/proj/entry.js", "/proj/", "/proj/empty-dir/"],
				(err, result_) => {
					if (err) return done(err);
					const result =
						/** @type {import("../lib/FileSystemInfo").ResolveBuildDependenciesResult} */ (
							result_
						);
					expect(result.files).toContain("/proj/entry.js");
					expect(result.files).toContain("/proj/lib.mjs");
					expect(result.files).toContain("/proj/node_modules/dep/index.js");
					// the package.json of the dir without one is recorded as missing
					expect(result.resolveDependencies.missing).toContain(
						"/proj/empty-dir/package.json"
					);
					expect(result.resolveResults.size).toBeGreaterThan(0);
					// the optional dependency that fails to resolve is recorded as `false`
					expect([...result.resolveResults.values()]).toContain(false);
					// the resolved set still validates unchanged
					fsInfo.checkResolveResultsValid(
						result.resolveResults,
						(err, valid) => {
							if (err) return done(err);
							expect(valid).toBe(true);
							done();
						}
					);
				}
			);
		});

		it("checkResolveResultsValid reports invalid when an expected-missing dep appears", (done) => {
			const fs = createProjectFs();
			const fsInfo = createProjectFsInfo(fs);
			fsInfo.resolveBuildDependencies("/proj", ["/proj/"], (err, result_) => {
				if (err) return done(err);
				const result =
					/** @type {import("../lib/FileSystemInfo").ResolveBuildDependenciesResult} */ (
						result_
					);
				// Create the previously-missing optional dependency.
				fs.mkdirSync("/proj/node_modules/missing-dep", { recursive: true });
				fs.writeFileSync(
					"/proj/node_modules/missing-dep/package.json",
					JSON.stringify({ name: "missing-dep", version: "1.0.0" })
				);
				const fsInfo2 = createProjectFsInfo(fs);
				fsInfo2.checkResolveResultsValid(
					result.resolveResults,
					(err, valid) => {
						if (err) return done(err);
						expect(valid).toBe(false);
						done();
					}
				);
			});
		});

		it("checkResolveResultsValid errors on an unexpected key type", (done) => {
			const fs = createProjectFs();
			const fsInfo = createProjectFsInfo(fs);
			fsInfo.checkResolveResultsValid(
				new Map([["x\n/proj\n./entry", "/proj/entry.js"]]),
				(err) => {
					expect(err).toBeInstanceOf(Error);
					done();
				}
			);
		});

		it("parses ESM specifiers covering every string-escape form", (done) => {
			const fs = createFsFromVolume(new Volume());
			fs.mkdirSync("/proj", { recursive: true });
			const CR = "\r";
			const LF = "\n";
			const LS = "\u2028";
			const PS = "\u2029";
			// Template literals keep es-module-lexer's `n` unset, so the specifier
			// flows through `parseString`; the bad ones throw and are caught.
			const source = `${[
				"import(``);",
				"import(`./plain.mjs`);",
				"import(`./hex\\x41.mjs`);",
				"import(`./unicode\\u0041.mjs`);",
				"import(`./codepoint\\u{1F600}.mjs`);",
				"import(`./named\\n\\t\\r\\b\\f\\v.mjs`);",
				"import(`./nul\\0.mjs`);",
				"import(`./other\\q\\$.mjs`);",
				`import(\`./cont\\${LF}lf.mjs\`);`,
				`import(\`./cont\\${CR}cr.mjs\`);`,
				`import(\`./cont\\${CR}${LF}crlf.mjs\`);`,
				`import(\`./cont\\${LS}ls.mjs\`);`,
				`import(\`./cont\\${PS}ps.mjs\`);`,
				`import(\`./raw${CR}cr.mjs\`);`,
				"import(`./bad-hex\\xZZ.mjs`);",
				"import(`./bad-unicode\\uZZZZ.mjs`);",
				"import(`./bad-codepoint\\u{110000}.mjs`);",
				"import(`./empty-codepoint\\u{}.mjs`);",
				"import(`./octal\\101.mjs`);",
				"import(`./decimal\\8.mjs`);",
				// Non-analyzable args keep `n` unset and feed a string literal to
				// parseString: legacy octal, \\8, and a non-literal (returns null).
				'import("\\101" + x);',
				'import("\\8" + x);',
				'import(x + "\\u0041");'
			].join("\n")}\n`;
			fs.writeFileSync("/proj/entry.mjs", source);
			const fsInfo = createProjectFsInfo(fs);
			fsInfo.resolveBuildDependencies(
				"/proj",
				["/proj/entry.mjs"],
				(err, result) => {
					if (err) return done(err);
					expect(result).toBeDefined();
					done();
				}
			);
		});
	});

	describe("managed item info", () => {
		const setupManaged = (/** @type {(fs: IFs) => void} */ extra) => {
			const fs = createFsFromVolume(new Volume());
			fs.mkdirSync("/root/node_modules/normal", { recursive: true });
			fs.writeFileSync(
				"/root/node_modules/normal/package.json",
				JSON.stringify({ name: "normal", version: "1.0.0" })
			);
			extra(/** @type {IFs} */ (/** @type {unknown} */ (fs)));
			/** @type {import("../lib/logging/Logger").Logger & Record<string, (...args: unknown[]) => unknown>} */
			const logger =
				/** @type {import("../lib/logging/Logger").Logger & Record<string, (...args: unknown[]) => unknown>} */ (
					/** @type {unknown} */ ({
						error: (/** @type {unknown[]} */ ...args) => {
							throw new Error(util.format(...args));
						}
					})
				);
			/** @type {string[]} */
			const warnings = [];
			for (const method of ["warn", "info", "log", "debug"]) {
				logger[method] = (/** @type {unknown[]} */ ...args) => {
					if (method === "warn") warnings.push(util.format(...args));
				};
			}
			const fsInfo = new FileSystemInfo(
				/** @type {import("../lib/util/fs").InputFileSystem} */ (
					/** @type {unknown} */ (fs)
				),
				{
					logger,
					managedPaths: ["/root/node_modules"],
					hashFunction: "sha256"
				}
			);
			return { fs, fsInfo, warnings };
		};

		const snapshotFiles = (
			/** @type {import("../lib/FileSystemInfo")} */ fsInfo,
			/** @type {string[]} */ fileList,
			/** @type {(err?: Error | null, snapshot?: Snapshot | null) => void} */ callback
		) => {
			fsInfo.createSnapshot(
				Date.now() + 10000,
				fileList,
				[],
				[],
				{ timestamp: true },
				callback
			);
		};

		it("captures a normal package and a `*nested` grouping folder", (done) => {
			const { fsInfo } = setupManaged((fs) => {
				// grouping folder containing only `node_modules` → "*nested"
				fs.mkdirSync("/root/node_modules/group/node_modules", {
					recursive: true
				});
			});
			snapshotFiles(
				fsInfo,
				[
					"/root/node_modules/normal/index.js",
					"/root/node_modules/group/index.js"
				],
				(err, snapshot) => {
					if (err) return done(err);
					const info = /** @type {Map<string, string>} */ (
						/** @type {Snapshot} */ (snapshot).managedItemInfo
					);
					expect(info.get("/root/node_modules/normal")).toBe("normal@1.0.0");
					expect(info.get("/root/node_modules/group")).toBe("*nested");
					done();
				}
			);
		});

		it("treats a nested `node_modules` directory as `*node_modules`", (done) => {
			const { fsInfo } = setupManaged((fs) => {
				fs.mkdirSync("/root/node_modules/sub/node_modules", {
					recursive: true
				});
			});
			snapshotFiles(
				fsInfo,
				["/root/node_modules/sub/node_modules"],
				(err, snapshot) => {
					if (err) return done(err);
					expect(
						/** @type {Map<string, string>} */ (
							/** @type {Snapshot} */ (snapshot).managedItemInfo
						).get("/root/node_modules/sub/node_modules")
					).toBe("*node_modules");
					done();
				}
			);
		});

		it("warns on a package.json without a name and on a non-package folder", (done) => {
			const { fsInfo, warnings } = setupManaged((fs) => {
				fs.mkdirSync("/root/node_modules/noname", { recursive: true });
				fs.writeFileSync(
					"/root/node_modules/noname/package.json",
					JSON.stringify({ version: "1.0.0" })
				);
				fs.mkdirSync("/root/node_modules/bare", { recursive: true });
				fs.writeFileSync("/root/node_modules/bare/file.txt", "x");
			});
			snapshotFiles(
				fsInfo,
				[
					"/root/node_modules/noname/index.js",
					"/root/node_modules/bare/index.js"
				],
				(err) => {
					if (err) return done(err);
					expect(warnings.some((w) => /doesn't contain a "name"/.test(w))).toBe(
						true
					);
					expect(
						warnings.some((w) =>
							/isn't a directory or doesn't contain a package\.json/.test(w)
						)
					).toBe(true);
					done();
				}
			);
		});

		it("propagates a package.json JSON parse error", (done) => {
			const { fsInfo } = setupManaged((fs) => {
				fs.mkdirSync("/root/node_modules/broken", { recursive: true });
				fs.writeFileSync(
					"/root/node_modules/broken/package.json",
					"{ not json"
				);
			});
			fsInfo.createSnapshot(
				Date.now() + 10000,
				["/root/node_modules/broken/index.js"],
				[],
				[],
				{ timestamp: true },
				(err, snapshot) => {
					// A parse error aborts the snapshot with a null result.
					expect(snapshot).toBeNull();
					done();
				}
			);
		});
	});

	describe("cached getters", () => {
		it("serve resolved values from the cache", (done) => {
			const fs = createFs();
			const fsInfo = createFsInfo(fs);
			const t = Date.now() + 10000;
			const file = "/path/file.txt";
			const dir = "/path/context";
			// Populate the timestamp, hash and tsh caches for files and contexts.
			fsInfo.createSnapshot(
				t,
				files,
				directories,
				missing,
				{ timestamp: true },
				(err) => {
					if (err) return done(err);
					fsInfo.createSnapshot(
						t,
						files,
						directories,
						missing,
						{ hash: true },
						(err) => {
							if (err) return done(err);
							fsInfo.createSnapshot(
								t,
								files,
								directories,
								missing,
								{ timestamp: true, hash: true },
								(err) => {
									if (err) return done(err);
									fsInfo.getFileTimestamp(file, (err, ts) => {
										if (err) return done(err);
										expect(ts).toBeTruthy();
										fsInfo.getFileHash(file, (err, h) => {
											if (err) return done(err);
											expect(typeof h).toBe("string");
											fsInfo.getContextTimestamp(dir, (err, cts) => {
												if (err) return done(err);
												expect(cts).toBeTruthy();
												fsInfo.getContextHash(dir, (err, ch) => {
													if (err) return done(err);
													expect(typeof ch).toBe("string");
													fsInfo.getContextTsh(dir, (err, tsh) => {
														if (err) return done(err);
														expect(tsh).toBeTruthy();
														done();
													});
												});
											});
										});
									});
								}
							);
						}
					);
				}
			);
		});
	});

	describe("serialization and iteration", () => {
		it("round-trips every snapshot field and iterates across children", (done) => {
			const fs = createFs();
			const fsInfo = createFsInfo(fs);
			const t = Date.now() + 10000;
			fsInfo.createSnapshot(
				t,
				["/path/file.txt"],
				[],
				[],
				{ timestamp: true },
				(err, childA) => {
					if (err) return done(err);
					fsInfo.createSnapshot(
						t,
						["/path/file2.txt"],
						[],
						[],
						{ timestamp: true },
						(err, childB) => {
							if (err) return done(err);
							fsInfo.createSnapshot(
								t,
								files,
								directories,
								missing,
								{ timestamp: true, hash: true },
								(err, base_) => {
									if (err) return done(err);
									const base = /** @type {Snapshot} */ (base_);
									const cA = /** @type {Snapshot} */ (childA);
									const cB = /** @type {Snapshot} */ (childB);
									// Populate every remaining map/set so all serialization
									// flags and `has*` getters are exercised.
									base.setFileTimestamps(new Map([["/f", null]]));
									base.setFileHashes(new Map([["/f", "h"]]));
									base.setContextTimestamps(new Map([["/c", null]]));
									base.setContextHashes(new Map([["/c", "h"]]));
									base.setManagedItemInfo(new Map([["/m", "m@1.0.0"]]));
									base.setManagedFiles(new Set(["/mf"]));
									base.setManagedContexts(new Set(["/mc"]));
									base.setManagedMissing(new Set(["/mm"]));
									// Two children → the iterator's multi-child queue path.
									base.setChildren(new Set([cA, cB]));
									const restored =
										/** @type {Snapshot & Record<string, (...args: unknown[]) => unknown>} */ (
											/** @type {unknown} */ (
												clone(
													/** @type {Record<string, unknown>} */ (
														/** @type {unknown} */ (base)
													)
												)
											)
										);
									for (const has of [
										"hasStartTime",
										"hasFileTimestamps",
										"hasFileHashes",
										"hasFileTshs",
										"hasContextTimestamps",
										"hasContextHashes",
										"hasContextTshs",
										"hasMissingExistence",
										"hasManagedItemInfo",
										"hasManagedFiles",
										"hasManagedContexts",
										"hasManagedMissing",
										"hasChildren"
									]) {
										expect(restored[has]()).toBe(true);
									}
									const fileEntries = [...restored.getFileIterable()];
									expect(fileEntries).toContain("/path/file.txt");
									expect(fileEntries).toContain("/path/file2.txt");
									expect(
										[...restored.getContextIterable()].length
									).toBeGreaterThan(0);
									expect(
										[...restored.getMissingIterable()].length
									).toBeGreaterThan(0);
									// A single-child snapshot exercises the iterator shortcut.
									cA.setChildren(new Set([cB]));
									expect([...cA.getFileIterable()]).toContain(
										"/path/file2.txt"
									);
									done();
								}
							);
						}
					);
				}
			);
		});
	});

	describe("read errors abort snapshot creation", () => {
		it("hash mode: stores `directory` for a directory and aborts on read error", (done) => {
			const fs = createFs();
			const fsInfo = createFsInfo(fs);
			// Hashing a directory path yields the sentinel "directory".
			fsInfo.getFileHash("/path/context", (err, hash) => {
				if (err) return done(err);
				expect(hash).toBe("directory");
				jest.spyOn(fs, "readFile").mockImplementation((p, cb) => {
					const err = /** @type {Error & { code: string }} */ (
						new Error("denied")
					);
					err.code = "EACCES";
					/** @type {(err: Error & { code: string }) => void} */ (cb)(err);
				});
				fsInfo.createSnapshot(
					Date.now() + 10000,
					["/path/file.txt"],
					[],
					[],
					{ hash: true },
					(err, snapshot) => {
						expect(snapshot).toBeNull();
						done();
					}
				);
			});
		});

		it("timestamp mode: aborts when stat fails with a non-ENOENT error", (done) => {
			const fs = createFs();
			const fsInfo = createFsInfo(fs);
			jest.spyOn(fs, "stat").mockImplementation((p, cb) => {
				const err = /** @type {Error & { code: string }} */ (
					new Error("denied")
				);
				err.code = "EACCES";
				/** @type {(err: Error & { code: string }) => void} */ (cb)(err);
			});
			fsInfo.createSnapshot(
				Date.now() + 10000,
				["/path/file.txt"],
				[],
				[],
				{ timestamp: true },
				(err, snapshot) => {
					expect(snapshot).toBeNull();
					done();
				}
			);
		});
	});
});
