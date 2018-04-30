/* globals describe it */

var should = require("should");
var NodeWatchFileSystem = require("../lib/node/NodeWatchFileSystem");

describe("NodeWatchFileSystem", function() {
	it("should throw if 'files' argument is not an array", function() {
		should(function() {
			new NodeWatchFileSystem().watch(undefined);
		}).throw("Invalid arguments: 'files'");
	});

	it("should throw if 'dirs' argument is not an array", function() {
		should(function() {
			new NodeWatchFileSystem().watch([], undefined);
		}).throw("Invalid arguments: 'dirs'");
	});

	it("should throw if 'missing' argument is not an array", function() {
		should(function() {
			new NodeWatchFileSystem().watch([], [], undefined);
		}).throw("Invalid arguments: 'missing'");
	});

	it("should throw if 'starttime' argument is missing", function() {
		should(function() {
			new NodeWatchFileSystem().watch([], [], [], "42", {}, function() {});
		}).throw("Invalid arguments: 'startTime'");
	});

	it("should throw if 'callback' argument is missing", function() {
		should(function() {
			new NodeWatchFileSystem().watch([], [], [], 42, {}, undefined);
		}).throw("Invalid arguments: 'callback'");
	});

	it("should throw if 'options' argument is invalid", function() {
		should(function() {
			new NodeWatchFileSystem().watch([], [], [], 42, "options", function() {});
		}).throw("Invalid arguments: 'options'");
	});

	it("should throw if 'callbackUndelayed' argument is invalid", function() {
		should(function() {
			new NodeWatchFileSystem().watch(
				[],
				[],
				[],
				42,
				{},
				function() {},
				"undefined"
			);
		}).throw("Invalid arguments: 'callbackUndelayed'");
	});

	if (process.env.NO_WATCH_TESTS) {
		it("long running tests excluded");
		return;
	}

	var path = require("path");
	var fs = require("fs");
	var fixtures = path.join(__dirname, "fixtures");
	var fileDirect = path.join(fixtures, "watched-file.txt");
	var fileSubdir = path.join(fixtures, "subdir", "watched-file.txt");

	this.timeout(10000);

	it("should register a file change (change delayed)", function(done) {
		var startTime = new Date().getTime();
		var wfs = new NodeWatchFileSystem();
		var watcher = wfs.watch(
			[fileDirect],
			[],
			[],
			startTime,
			{
				aggregateTimeout: 1000
			},
			function(
				err,
				filesModified,
				dirsModified,
				missingCreated,
				fileTimestamps
			) {
				if (err) throw err;
				filesModified.should.be.eql([fileDirect]);
				dirsModified.should.be.eql([]);
				(typeof fileTimestamps.get(fileDirect)).should.be.eql("number");
				watcher.close();
				done();
			}
		);

		setTimeout(function() {
			fs.writeFile(fileDirect, "", function() {});
		}, 500);
	});
	it("should register a file change (watch delayed)", function(done) {
		var startTime = new Date().getTime();
		setTimeout(function() {
			var wfs = new NodeWatchFileSystem();
			var watcher = wfs.watch(
				[fileDirect],
				[],
				[],
				startTime,
				{
					aggregateTimeout: 1000
				},
				function(
					err,
					filesModified,
					dirsModified,
					missingCreated,
					fileTimestamps
				) {
					if (err) throw err;
					filesModified.should.be.eql([fileDirect]);
					dirsModified.should.be.eql([]);
					(typeof fileTimestamps.get(fileDirect)).should.be.eql("number");
					watcher.close();
					done();
				}
			);
		}, 500);

		fs.writeFile(fileDirect, "", function() {});
	});
	it("should register a context change (change delayed)", function(done) {
		var startTime = new Date().getTime();
		var wfs = new NodeWatchFileSystem();
		var watcher = wfs.watch(
			[],
			[fixtures],
			[],
			startTime,
			{
				aggregateTimeout: 1000
			},
			function(
				err,
				filesModified,
				dirsModified,
				missingCreated,
				fileTimestamps,
				dirTimestamps
			) {
				if (err) throw err;
				filesModified.should.be.eql([]);
				dirsModified.should.be.eql([fixtures]);
				(typeof dirTimestamps.get(fixtures)).should.be.eql("number");
				watcher.close();
				done();
			}
		);

		setTimeout(function() {
			fs.writeFile(fileDirect, "", function() {});
		}, 500);
	});
	it("should register a context change (watch delayed)", function(done) {
		var startTime = new Date().getTime();
		setTimeout(function() {
			var wfs = new NodeWatchFileSystem();
			var watcher = wfs.watch(
				[],
				[fixtures],
				[],
				startTime,
				{
					aggregateTimeout: 1000
				},
				function(
					err,
					filesModified,
					dirsModified,
					missingCreated,
					fileTimestamps,
					dirTimestamps
				) {
					if (err) throw err;
					filesModified.should.be.eql([]);
					dirsModified.should.be.eql([fixtures]);
					(typeof dirTimestamps.get(fixtures)).should.be.eql("number");
					watcher.close();
					done();
				}
			);
		}, 500);

		fs.writeFile(fileDirect, "", function() {});
	});
	it("should register a context change (change delayed, subdirectory)", function(done) {
		var startTime = new Date().getTime();
		var wfs = new NodeWatchFileSystem();
		var watcher = wfs.watch(
			[],
			[fixtures],
			[],
			startTime,
			{
				aggregateTimeout: 1000
			},
			function(
				err,
				filesModified,
				dirsModified,
				missingCreated,
				fileTimestamps,
				dirTimestamps
			) {
				if (err) throw err;
				filesModified.should.be.eql([]);
				dirsModified.should.be.eql([fixtures]);
				(typeof dirTimestamps.get(fixtures)).should.be.eql("number");
				watcher.close();
				done();
			}
		);

		setTimeout(function() {
			fs.writeFile(fileSubdir, "", function() {});
		}, 500);
	});
	it("should register a context change (watch delayed, subdirectory)", function(done) {
		var startTime = new Date().getTime();
		setTimeout(function() {
			var wfs = new NodeWatchFileSystem();
			var watcher = wfs.watch(
				[],
				[fixtures],
				[],
				startTime,
				{
					aggregateTimeout: 1000
				},
				function(
					err,
					filesModified,
					dirsModified,
					missingCreated,
					fileTimestamps,
					dirTimestamps
				) {
					if (err) throw err;
					filesModified.should.be.eql([]);
					dirsModified.should.be.eql([fixtures]);
					(typeof dirTimestamps.get(fixtures)).should.be.eql("number");
					watcher.close();
					done();
				}
			);
		}, 500);

		fs.writeFile(fileSubdir, "", function() {});
	});
	it("should allow to combine all", function(done) {
		var startTime = new Date().getTime();
		setTimeout(function() {
			var wfs = new NodeWatchFileSystem();
			var watcher = wfs.watch(
				[fileDirect, fileSubdir],
				[fixtures],
				[],
				startTime,
				{
					aggregateTimeout: 1000
				},
				function(
					err,
					filesModified,
					dirsModified,
					missingCreated,
					fileTimestamps,
					dirTimestamps
				) {
					if (err) throw err;
					filesModified.should.be.eql([fileSubdir, fileDirect]);
					dirsModified.should.be.eql([fixtures]);
					(typeof fileTimestamps.get(fileDirect)).should.be.eql("number");
					(typeof fileTimestamps.get(fileSubdir)).should.be.eql("number");
					(typeof dirTimestamps.get(fixtures)).should.be.eql("number");
					watcher.close();
					done();
				}
			);
		}, 500);

		fs.writeFile(fileDirect, "", function() {});
		fs.writeFile(fileSubdir, "", function() {});
	});
	it("should sum up multiple changes", function(done) {
		var startTime = new Date().getTime();
		var wfs = new NodeWatchFileSystem();
		var watcher = wfs.watch(
			[fileDirect, fileSubdir],
			[fixtures],
			[],
			startTime,
			{
				aggregateTimeout: 1000
			},
			function(
				err,
				filesModified,
				dirsModified,
				missingCreated,
				fileTimestamps,
				dirTimestamps
			) {
				if (err) throw err;
				filesModified.should.be.eql([fileSubdir, fileDirect]);
				dirsModified.should.be.eql([fixtures]);
				(typeof fileTimestamps.get(fileDirect)).should.be.eql("number");
				(typeof fileTimestamps.get(fileSubdir)).should.be.eql("number");
				(typeof dirTimestamps.get(fixtures)).should.be.eql("number");
				watcher.close();
				done();
			}
		);

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
});
