/* globals describe it */

if(process.env.NO_WATCH_TESTS) {
	describe("NodeWatchFileSystem", function() {
		it("tests excluded");
	});
	return;
}

require("should");
var path = require("path");
var fs = require("fs");

var NodeWatchFileSystem = require("../lib/node/NodeWatchFileSystem");

var fixtures = path.join(__dirname, "fixtures");
var fileDirect = path.join(fixtures, "watched-file.txt");
var fileSubdir = path.join(fixtures, "subdir", "watched-file.txt");

describe("NodeWatchFileSystem", function() {
	this.timeout(10000);
	it("should register a file change (change delayed)", function(done) {
		var startTime = new Date().getTime();
		var wfs = new NodeWatchFileSystem();
		var watcher = wfs.watch([fileDirect], [], [], startTime, { aggregateTimeout: 1000 }, function(err, filesModified, dirsModified, missingCreated, fileTimestamps /*, dirTimestamps */) {
			if(err) throw err;
			filesModified.should.be.eql([fileDirect]);
			dirsModified.should.be.eql([]);
			fileTimestamps.should.have.property(fileDirect).have.type("number");
			watcher.close();
			done();
		});

		setTimeout(function() {
			fs.writeFile(fileDirect, "", function() {});
		}, 500);
	});
	it("should register a file change (watch delayed)", function(done) {
		var startTime = new Date().getTime();
		setTimeout(function() {
			var wfs = new NodeWatchFileSystem();
			var watcher = wfs.watch([fileDirect], [], [], startTime, { aggregateTimeout: 1000 }, function(err, filesModified, dirsModified, missingCreated, fileTimestamps /*, dirTimestamps */) {
				if(err) throw err;
				filesModified.should.be.eql([fileDirect]);
				dirsModified.should.be.eql([]);
				fileTimestamps.should.have.property(fileDirect).have.type("number");
				watcher.close();
				done();
			});
		}, 500);

		fs.writeFile(fileDirect, "", function() {});
	});
	it("should register a context change (change delayed)", function(done) {
		var startTime = new Date().getTime();
		var wfs = new NodeWatchFileSystem();
		var watcher = wfs.watch([], [fixtures], [], startTime, { aggregateTimeout: 1000 }, function(err, filesModified, dirsModified, missingCreated, fileTimestamps, dirTimestamps) {
			if(err) throw err;
			filesModified.should.be.eql([]);
			dirsModified.should.be.eql([fixtures]);
			dirTimestamps.should.have.property(fixtures).have.type("number");
			watcher.close();
			done();
		});

		setTimeout(function() {
			fs.writeFile(fileDirect, "", function() {});
		}, 500);
	});
	it("should register a context change (watch delayed)", function(done) {
		var startTime = new Date().getTime();
		setTimeout(function() {
			var wfs = new NodeWatchFileSystem();
			var watcher = wfs.watch([], [fixtures], [], startTime, { aggregateTimeout: 1000 }, function(err, filesModified, dirsModified, missingCreated, fileTimestamps, dirTimestamps) {
				if(err) throw err;
				filesModified.should.be.eql([]);
				dirsModified.should.be.eql([fixtures]);
				dirTimestamps.should.have.property(fixtures).have.type("number");
				watcher.close();
				done();
			});
		}, 500);

		fs.writeFile(fileDirect, "", function() {});
	});
	it("should register a context change (change delayed, subdirectory)", function(done) {
		var startTime = new Date().getTime();
		var wfs = new NodeWatchFileSystem();
		var watcher = wfs.watch([], [fixtures], [], startTime, { aggregateTimeout: 1000 }, function(err, filesModified, dirsModified, missingCreated, fileTimestamps, dirTimestamps) {
			if(err) throw err;
			filesModified.should.be.eql([]);
			dirsModified.should.be.eql([fixtures]);
			dirTimestamps.should.have.property(fixtures).have.type("number");
			watcher.close();
			done();
		});

		setTimeout(function() {
			fs.writeFile(fileSubdir, "", function() {});
		}, 500);
	});
	it("should register a context change (watch delayed, subdirectory)", function(done) {
		var startTime = new Date().getTime();
		setTimeout(function() {
			var wfs = new NodeWatchFileSystem();
			var watcher = wfs.watch([], [fixtures], [], startTime, { aggregateTimeout: 1000 }, function(err, filesModified, dirsModified, missingCreated, fileTimestamps, dirTimestamps) {
				if(err) throw err;
				filesModified.should.be.eql([]);
				dirsModified.should.be.eql([fixtures]);
				dirTimestamps.should.have.property(fixtures).have.type("number");
				watcher.close();
				done();
			});
		}, 500);

		fs.writeFile(fileSubdir, "", function() {});
	});
	it("should allow to combine all", function(done) {
		var startTime = new Date().getTime();
		setTimeout(function() {
			var wfs = new NodeWatchFileSystem();
			var watcher = wfs.watch([fileDirect, fileSubdir], [fixtures], [], startTime, { aggregateTimeout: 1000 }, function(err, filesModified, dirsModified, missingCreated, fileTimestamps, dirTimestamps) {
				if(err) throw err;
				filesModified.should.be.eql([fileSubdir, fileDirect]);
				dirsModified.should.be.eql([fixtures]);
				fileTimestamps.should.have.property(fileDirect).have.type("number");
				fileTimestamps.should.have.property(fileSubdir).have.type("number");
				dirTimestamps.should.have.property(fixtures).have.type("number");
				watcher.close();
				done();
			});
		}, 500);

		fs.writeFile(fileDirect, "", function() {});
		fs.writeFile(fileSubdir, "", function() {});
	});
	it("should sum up multiple changes", function(done) {
		var startTime = new Date().getTime();
			var wfs = new NodeWatchFileSystem();
			var watcher = wfs.watch([fileDirect, fileSubdir], [fixtures], [], startTime, { aggregateTimeout: 1000 }, function(err, filesModified, dirsModified, missingCreated, fileTimestamps, dirTimestamps) {
				if(err) throw err;
				filesModified.should.be.eql([fileSubdir, fileDirect]);
				dirsModified.should.be.eql([fixtures]);
				fileTimestamps.should.have.property(fileDirect).have.type("number");
				fileTimestamps.should.have.property(fileSubdir).have.type("number");
				dirTimestamps.should.have.property(fixtures).have.type("number");
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
});
