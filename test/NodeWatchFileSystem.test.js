var should = require("should");
var path = require("path");
var fs = require("fs");

var NodeWatchFileSystem = require("../lib/node/NodeWatchFileSystem");

var fixtures = path.join(__dirname, "fixtures");
var fileDirect = path.join(fixtures, "watched-file.txt");
var fileSubdir = path.join(fixtures, "subdir", "watched-file.txt");

function simpleObject(key, value) {
	var obj = {};
	obj[key] = value;
	return obj;
}

describe("NodeWatchFileSystem", function() {
	this.timeout(5000);
	it("should register a file change (change delayed)", function(done) {
		var startTime = new Date().getTime();
		new NodeWatchFileSystem().watch([fileDirect], [], startTime, 1000, function(err, filesModified, dirsModified, fileTimestamps, dirTimestamps) {
			if(err) throw err;
			filesModified.should.be.eql([fileDirect]);
			dirsModified.should.be.eql([]);
			fileTimestamps.should.have.property(fileDirect).have.type("number");
			dirTimestamps.should.be.eql({});
			done();
		});

		setTimeout(function() {
			fs.writeFile(fileDirect, "", function() {});
		}, 500);
	});
	it("should register a file change (watch delayed)", function(done) {
		var startTime = new Date().getTime();
		setTimeout(function() {
			new NodeWatchFileSystem().watch([fileDirect], [], startTime, 1000, function(err, filesModified, dirsModified, fileTimestamps, dirTimestamps) {
				if(err) throw err;
				filesModified.should.be.eql([fileDirect]);
				dirsModified.should.be.eql([]);
				fileTimestamps.should.have.property(fileDirect).have.type("number");
				dirTimestamps.should.be.eql({});
				done();
			});
		}, 500);

		fs.writeFile(fileDirect, "", function() {});
	});
	it("should register a context change (change delayed)", function(done) {
		var startTime = new Date().getTime();
		new NodeWatchFileSystem().watch([], [fixtures], startTime, 1000, function(err, filesModified, dirsModified, fileTimestamps, dirTimestamps) {
			if(err) throw err;
			filesModified.should.be.eql([]);
			dirsModified.should.be.eql([fixtures]);
			fileTimestamps.should.be.eql({});
			dirTimestamps.should.have.property(fixtures).have.type("number");
			done();
		});

		setTimeout(function() {
			fs.writeFile(fileDirect, "", function() {});
		}, 500);
	});
	it("should register a context change (watch delayed)", function(done) {
		var startTime = new Date().getTime();
		setTimeout(function() {
			new NodeWatchFileSystem().watch([], [fixtures], startTime, 1000, function(err, filesModified, dirsModified, fileTimestamps, dirTimestamps) {
				if(err) throw err;
				filesModified.should.be.eql([]);
				dirsModified.should.be.eql([fixtures]);
				fileTimestamps.should.be.eql({});
				dirTimestamps.should.have.property(fixtures).have.type("number");
				done();
			});
		}, 500);

		fs.writeFile(fileDirect, "", function() {});
	});
	it("should register a context change (change delayed, subdirectory)", function(done) {
		var startTime = new Date().getTime();
		new NodeWatchFileSystem().watch([], [fixtures], startTime, 1000, function(err, filesModified, dirsModified, fileTimestamps, dirTimestamps) {
			if(err) throw err;
			filesModified.should.be.eql([]);
			dirsModified.should.be.eql([fixtures]);
			fileTimestamps.should.be.eql({});
			dirTimestamps.should.have.property(fixtures).have.type("number");
			done();
		});

		setTimeout(function() {
			fs.writeFile(fileSubdir, "", function() {});
		}, 500);
	});
	it("should register a context change (watch delayed, subdirectory)", function(done) {
		var startTime = new Date().getTime();
		setTimeout(function() {
			new NodeWatchFileSystem().watch([], [fixtures], startTime, 1000, function(err, filesModified, dirsModified, fileTimestamps, dirTimestamps) {
				if(err) throw err;
				filesModified.should.be.eql([]);
				dirsModified.should.be.eql([fixtures]);
				fileTimestamps.should.be.eql({});
				dirTimestamps.should.have.property(fixtures).have.type("number");
				done();
			});
		}, 500);

		fs.writeFile(fileSubdir, "", function() {});
	});
	it("should allow to combine all", function(done) {
		var startTime = new Date().getTime();
		setTimeout(function() {
			new NodeWatchFileSystem().watch([fileDirect, fileSubdir], [fixtures], startTime, 1000, function(err, filesModified, dirsModified, fileTimestamps, dirTimestamps) {
				if(err) throw err;
				filesModified.should.be.eql([fileSubdir, fileDirect]);
				dirsModified.should.be.eql([fixtures]);
				fileTimestamps.should.have.property(fileDirect).have.type("number");
				fileTimestamps.should.have.property(fileSubdir).have.type("number");
				dirTimestamps.should.have.property(fixtures).have.type("number");
				done();
			});
		}, 500);

		fs.writeFile(fileDirect, "", function() {});
		fs.writeFile(fileSubdir, "", function() {});
	});
	it("should sum up multiple changes", function(done) {
		var startTime = new Date().getTime();
			new NodeWatchFileSystem().watch([fileDirect, fileSubdir], [fixtures], startTime, 1000, function(err, filesModified, dirsModified, fileTimestamps, dirTimestamps) {
				if(err) throw err;
				filesModified.should.be.eql([fileSubdir, fileDirect]);
				dirsModified.should.be.eql([fixtures]);
				fileTimestamps.should.have.property(fileDirect).have.type("number");
				fileTimestamps.should.have.property(fileSubdir).have.type("number");
				dirTimestamps.should.have.property(fixtures).have.type("number");
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