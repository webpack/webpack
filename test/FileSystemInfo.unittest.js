"use strict";

const { createFsFromVolume, Volume } = require("memfs");
const util = require("util");
const FileSystemInfo = require("../lib/FileSystemInfo");
const { buffersSerializer } = require("../lib/util/serialization");

describe("FileSystemInfo", () => {
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
		"/path/missing.txt"
	];
	const directories = [
		"/path/context+files",
		"/path/context",
		"/path/missing",
		"/path/node_modules/package",
		"/path/node_modules/missing",
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
	const managedPaths = ["/path/node_modules"];
	const immutablePaths = ["/path/cache"];
	const createFs = () => {
		const fs = createFsFromVolume(new Volume());
		fs.mkdirpSync("/path/context+files/sub");
		fs.mkdirpSync("/path/context/sub");
		fs.mkdirpSync("/path/nested/deep");
		fs.mkdirpSync("/path/node_modules/package");
		fs.mkdirpSync("/path/cache/package-1234");
		fs.mkdirpSync("/path/folder/context");
		fs.mkdirpSync("/path/folder/context+files");
		fs.mkdirpSync("/path/folder/nested");
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
		fs.symlinkSync("/path/folder/context", "/path/context/sub/symlink", "dir");
		fs.symlinkSync(
			"/path/folder/context+files",
			"/path/context+files/sub/symlink",
			"dir"
		);
		fs.symlinkSync("/path/folder/nested", "/path/nested/deep/symlink", "dir");
		return fs;
	};

	const createFsInfo = fs => {
		const logger = {
			error: (...args) => {
				throw new Error(util.format(...args));
			}
		};
		const fsInfo = new FileSystemInfo(fs, {
			logger,
			managedPaths,
			immutablePaths
		});
		for (const method of ["warn", "info", "log", "debug"]) {
			fsInfo.logs = [];
			fsInfo[method] = [];
			logger[method] = (...args) => {
				const msg = util.format(...args);
				fsInfo[method].push(msg);
				fsInfo.logs.push(`[${method}] ${msg}`);
			};
		}
		fsInfo.addFileTimestamps(new Map(ignored.map(i => [i, "ignore"])));
		return fsInfo;
	};

	const createSnapshot = (fs, options, callback) => {
		const fsInfo = createFsInfo(fs);
		fsInfo.createSnapshot(
			Date.now() + 10000,
			files,
			directories,
			missing,
			options,
			(err, snapshot) => {
				if (err) return callback(err);
				snapshot.name = "initial snapshot";
				// create another one to test the caching
				fsInfo.createSnapshot(
					Date.now() + 10000,
					files,
					directories,
					missing,
					options,
					(err, snapshot2) => {
						if (err) return callback(err);
						snapshot2.name = "cached snapshot";
						callback(null, snapshot, snapshot2);
					}
				);
			}
		);
	};

	const clone = object => {
		const serialized = buffersSerializer.serialize(object, {});
		return buffersSerializer.deserialize(serialized, {});
	};

	const expectSnapshotsState = (
		fs,
		snapshot,
		snapshot2,
		expected,
		callback
	) => {
		expectSnapshotState(fs, snapshot, expected, err => {
			if (err) return callback(err);
			if (!snapshot2) return callback();
			expectSnapshotState(fs, snapshot2, expected, callback);
		});
	};

	const expectSnapshotState = (fs, snapshot, expected, callback) => {
		const fsInfo = createFsInfo(fs);
		const details = snapshot => `${fsInfo.logs.join("\n")}
${util.inspect(snapshot, false, Infinity, true)}`;
		fsInfo.checkSnapshotValid(snapshot, (err, valid) => {
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
			fsInfo.checkSnapshotValid(snapshot, (err, valid) => {
				if (err) return callback(err);
				if (valid !== expected) {
					return callback(
						new Error(`Expected snapshot lead to the same result when directly cached:
${details(snapshot)}`)
					);
				}
				// Another try to check if indirect caching works
				fsInfo.checkSnapshotValid(clone(snapshot), (err, valid) => {
					if (err) return callback(err);
					if (valid !== expected) {
						return callback(
							new Error(`Expected snapshot lead to the same result when indirectly cached:
${details(snapshot)}`)
						);
					}
					callback();
				});
			});
		});
	};

	const updateFile = (fs, filename) => {
		const oldContent = fs.readFileSync(filename, "utf-8");
		if (filename.endsWith(".json")) {
			const data = JSON.parse(oldContent);
			fs.writeFileSync(
				filename,

				JSON.stringify({
					...data,
					version: data.version + ".1"
				})
			);
		} else {
			fs.writeFileSync(
				filename,

				oldContent + "!"
			);
		}
	};

	for (const [name, options] of [
		["timestamp", { timestamp: true }],
		["hash", { hash: true }],
		["tsh", { timestamp: true, hash: true }]
	]) {
		describe(`${name} mode`, () => {
			it("should always accept an empty snapshot", done => {
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

			it("should accept a snapshot when fs is unchanged", done => {
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
				...(name !== "timestamp" ? ignoredFileChanges : []),
				...(name === "hash" ? ["/path/context/sub/ignored.txt"] : [])
			]) {
				it(`should invalidate the snapshot when ${fileChange} is changed`, done => {
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
				it(`should not invalidate the snapshot when ${fileChange} is changed`, done => {
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
				it(`should invalidate the snapshot when ${newFile} is created`, done => {
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
				it(`should not invalidate the snapshot when ${newFile} is created`, done => {
					const fs = createFs();
					createSnapshot(fs, options, (err, snapshot, snapshot2) => {
						if (err) return done(err);
						fs.writeFileSync(newFile, "New file");
						expectSnapshotsState(fs, snapshot, snapshot2, true, done);
					});
				});
			}

			if (name !== "timestamp") {
				it("should not invalidate snapshot when only timestamps have changed", done => {
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
});
