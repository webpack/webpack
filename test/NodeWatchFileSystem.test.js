var NodeWatchFileSystem = require("../lib/node/NodeWatchFileSystem");

describe("NodeWatchFileSystem", function() {
	it('should throw if \'files\' argument is not an array', function() {
		expect(function() {
			new NodeWatchFileSystem().watch(undefined)
		}).toThrow("Invalid arguments: 'files'");
	});

	it('should throw if \'dirs\' argument is not an array', function() {
		expect(function() {
			new NodeWatchFileSystem().watch([], undefined)
		}).toThrow("Invalid arguments: 'dirs'");
	});

	it('should throw if \'missing\' argument is not an array', function() {
		expect(function() {
			new NodeWatchFileSystem().watch([], [], undefined)
		}).toThrow("Invalid arguments: 'missing'");
	});

	it('should throw if \'starttime\' argument is missing', function() {
		expect(function() {
			new NodeWatchFileSystem().watch([], [], [], '42', {}, function() {})
		}).toThrow("Invalid arguments: 'startTime'");
	});

	it('should throw if \'callback\' argument is missing', function() {
		expect(function() {
			new NodeWatchFileSystem().watch([], [], [], 42, {}, undefined)
		}).toThrow("Invalid arguments: 'callback'");
	});

	it('should throw if \'options\' argument is invalid', function() {
		expect(function() {
			new NodeWatchFileSystem().watch([], [], [], 42, 'options', function() {})
		}).toThrow("Invalid arguments: 'options'");
	});

	it('should throw if \'callbackUndelayed\' argument is invalid', function() {
		expect(function() {
			new NodeWatchFileSystem().watch([], [], [], 42, {}, function() {}, 'undefined')
		}).toThrow("Invalid arguments: 'callbackUndelayed'");
	});

	if(process.env.NO_WATCH_TESTS) {
		console.log("NodeWatchFileSystem: long running tests excluded.");
		return;
	}

	var path = require("path");
	var fs = require("fs");
	var fixtures = path.join(__dirname, "fixtures");
	var fileDirect = path.join(fixtures, "watched-file.txt");
	var fileSubdir = path.join(fixtures, "subdir", "watched-file.txt");

	it.skip("should register a file change (change delayed)", function(done) {
		jest.resetModules();
		expect.assertions(4);

		var startTime = new Date().getTime();
		var wfs = new NodeWatchFileSystem();
		var watcher = wfs.watch([fileDirect], [], [], startTime, {
			aggregateTimeout: 1000
		}, function(err, filesModified, dirsModified, missingCreated, fileTimestamps) {
			if(err) {
				done(err);
			}

			expect(filesModified).toEqual([fileDirect]);
			expect(dirsModified).toEqual([]);
			expect(fileTimestamps).toHaveProperty(fileDirect);
			expect(typeof fileTimestamps[fileDirect]).toBe('number');

			watcher.close();
			done();
		});

		setTimeout(function() {
			fs.writeFile(fileDirect, "", function() {});
		}, 500);
	});

	it.skip("should register a file change (watch delayed)", function(done) {
		var startTime = new Date().getTime();
		setTimeout(function() {
			var wfs = new NodeWatchFileSystem();
			var watcher = wfs.watch([fileDirect], [], [], startTime, {
				aggregateTimeout: 1000
			}, function(err, filesModified, dirsModified, missingCreated, fileTimestamps /*, dirTimestamps */ ) {
				if(err) throw err;
				expect(filesModified).toEqual([fileDirect]);
				expect(dirsModified).toEqual([]);

				const clonedTimestamps = Object.assign({}, fileTimestamps);
				expect(clonedTimestamps).toHaveProperty(fileDirect);
				expect(typeof clonedTimestamps[fileDirect]).toBe('number');

				watcher.close();
				done();
			});
		}, 500);

		fs.writeFile(fileDirect, "", function() {});
	});

	it.skip("should register a context change (change delayed)", function(done) {
		var startTime = new Date().getTime();
		var wfs = new NodeWatchFileSystem();
		var watcher = wfs.watch([], [fixtures], [], startTime, {
			aggregateTimeout: 1000
		}, function(err, filesModified, dirsModified, missingCreated, fileTimestamps, dirTimestamps) {
			if(err) throw err;
			expect(filesModified).toEqual([]);
			expect(dirsModified).toEqual([fixtures]);

			const clonedTimestamps = Object.assign({}, dirTimestamps);
			expect(clonedTimestamps).toHaveProperty(fixtures);
			expect(typeof clonedTimestamps[fixtures]).toBe('number');

			watcher.close();
			done();
		});

		setTimeout(function() {
			fs.writeFile(fileDirect, "", function() {});
		}, 500);
	});

	it.skip("should register a context change (watch delayed)", function(done) {
		var startTime = new Date().getTime();
		setTimeout(function() {
			var wfs = new NodeWatchFileSystem();
			var watcher = wfs.watch([], [fixtures], [], startTime, {
				aggregateTimeout: 1000
			}, function(err, filesModified, dirsModified, missingCreated, fileTimestamps, dirTimestamps) {
				if(err) throw err;
				expect(filesModified).toEqual([]);
				expect(dirsModified).toEqual([fixtures]);

				const clonedTimestamps = Object.assign({}, dirTimestamps);
				expect(clonedTimestamps).toHaveProperty(fixtures);
				expect(typeof clonedTimestamps[fixtures]).toBe('number');

				watcher.close();
				done();
			});
		}, 500);

		fs.writeFile(fileDirect, "", function() {});
	});

	it.skip("should register a context change (change delayed, subdirectory)", function(done) {
		var startTime = new Date().getTime();
		var wfs = new NodeWatchFileSystem();
		var watcher = wfs.watch([], [fixtures], [], startTime, {
			aggregateTimeout: 1000
		}, function(err, filesModified, dirsModified, missingCreated, fileTimestamps, dirTimestamps) {
			if(err) throw err;
			expect(filesModified).toEqual([]);
			expect(dirsModified).toEqual([fixtures]);

			const clonedTimestamps = Object.assign({}, dirTimestamps);
			expect(clonedTimestamps).toHaveProperty(fixtures);
			expect(typeof clonedTimestamps[fixtures]).toBe('number');

			watcher.close();
			done();
		});

		setTimeout(function() {
			fs.writeFile(fileSubdir, "", function() {});
		}, 500);
	});

	it.skip("should register a context change (watch delayed, subdirectory)", function(done) {
		var startTime = new Date().getTime();
		setTimeout(function() {
			var wfs = new NodeWatchFileSystem();
			var watcher = wfs.watch([], [fixtures], [], startTime, {
				aggregateTimeout: 1000
			}, function(err, filesModified, dirsModified, missingCreated, fileTimestamps, dirTimestamps) {
				if(err) throw err;
				expect(filesModified).toEqual([]);
				expect(dirsModified).toEqual([fixtures]);

				const clonedTimestamps = Object.assign({}, dirTimestamps);
				expect(clonedTimestamps).toHaveProperty(fixtures);
				expect(typeof clonedTimestamps[fixtures]).toBe('number');

				watcher.close();
				done();
			});
		}, 500);

		fs.writeFile(fileSubdir, "", function() {});
	});

	it.skip("should allow to combine all", function(done) {
		var startTime = new Date().getTime();
		setTimeout(function() {
			var wfs = new NodeWatchFileSystem();
			var watcher = wfs.watch([fileDirect, fileSubdir], [fixtures], [], startTime, {
				aggregateTimeout: 1000
			}, function(err, filesModified, dirsModified, missingCreated, fileTimestamps, dirTimestamps) {
				if(err) throw err;
				expect(filesModified).toEqual([fileSubdir, fileDirect]);
				expect(dirsModified).toEqual([fixtures]);

				const clonedFileTimestamps = Object.assign({}, fileTimestamps);
				expect(clonedFileTimestamps).toHaveProperty(fileDirect);
				expect(typeof clonedFileTimestamps[fileDirect]).toBe('number');
				expect(clonedFileTimestamps).toHaveProperty(fileSubdir);
				expect(typeof clonedFileTimestamps[fileSubdir]).toBe('number');

				const clonedDirTimestamps = Object.assign({}, dirTimestamps);
				expect(clonedDirTimestamps).toHaveProperty(fixtures);
				expect(typeof clonedDirTimestamps[fixtures]).toBe('number');

				watcher.close();
				done();
			});
		}, 500);

		fs.writeFile(fileDirect, "", function() {});
		fs.writeFile(fileSubdir, "", function() {});
	});

	it.skip("should sum up multiple changes", function(done) {
		var startTime = new Date().getTime();
		var wfs = new NodeWatchFileSystem();
		var watcher = wfs.watch([fileDirect, fileSubdir], [fixtures], [], startTime, {
			aggregateTimeout: 1000
		}, function(err, filesModified, dirsModified, missingCreated, fileTimestamps, dirTimestamps) {
			if(err) throw err;
			expect(filesModified).toEqual([fileSubdir, fileDirect]);
			expect(dirsModified).toEqual([fixtures]);

			const clonedFileTimestamps = Object.assign({}, fileTimestamps);
			expect(clonedFileTimestamps).toHaveProperty(fileDirect);
			expect(typeof clonedFileTimestamps[fileDirect]).toBe('number');
			expect(clonedFileTimestamps).toHaveProperty(fileSubdir);
			expect(typeof clonedFileTimestamps[fileSubdir]).toBe('number');

			const clonedDirTimestamps = Object.assign({}, dirTimestamps);
			expect(clonedDirTimestamps).toHaveProperty(fixtures);
			expect(typeof clonedDirTimestamps[fixtures]).toBe('number');

			watcher.close();
			done();
		});

		setTimeout(function() {
			fs.writeFile(fileDirect, "", function() {});
			setTimeout(function() {
				fs.writeFile(fileDirect, "", function() {});
				setTimeout(function() {
					fs.writeFile(fileDirect, "", function() {});
					setTimeout(function() {
						fs.writeFile(fileSubdir, "", function() {});
					}, 500);
				}, 500);
			}, 500);
		}, 500);
	});
}, 10000);
