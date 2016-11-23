var should = require("should");
var path = require("path");
var fs = require("fs");

var webpack = require("../");

describe("HotModuleReplacementPlugin", function() {
	this.timeout(10000);
	it("should not have circular hashes but equal if unmodified", function(done) {
		var entryFile = path.join(__dirname, "js", "entry.js");
		var statsFile1 = path.join(__dirname, "js", "HotModuleReplacementPlugin.test.stats1.txt");
		var statsFile2 = path.join(__dirname, "js", "HotModuleReplacementPlugin.test.stats2.txt");
		var recordsFile = path.join(__dirname, "js", "records.json");
		try {
			fs.mkdirSync(path.join(__dirname, "js"));
		} catch(e) {}
		try {
			fs.unlinkSync(recordsFile);
		} catch(e) {}
		var compiler = webpack({
			cache: false,
			entry: entryFile,
			recordsPath: recordsFile,
			output: {
				path: path.join(__dirname, "js")
			},
			plugins: [
				new webpack.HotModuleReplacementPlugin(),
				new webpack.optimize.OccurrenceOrderPlugin()
			]
		});
		fs.writeFileSync(entryFile, "1", "utf-8");
		compiler.run(function(err, stats) {
			if(err) throw err;
			var oldHash1 = stats.toJson().hash;
			fs.writeFileSync(statsFile1, stats.toString());
			compiler.run(function(err, stats) {
				if(err) throw err;
				var lastHash1 = stats.toJson().hash;
				fs.writeFileSync(statsFile2, stats.toString());
				lastHash1.should.be.eql(oldHash1, "hash shouldn't change when bundle stay equal");
				fs.writeFileSync(entryFile, "2", "utf-8");
				compiler.run(function(err, stats) {
					if(err) throw err;
					var lastHash2 = stats.toJson().hash;
					fs.writeFileSync(statsFile1, stats.toString());
					lastHash2.should.not.be.eql(lastHash1, "hash should change when bundle changes");
					fs.writeFileSync(entryFile, "1", "utf-8");
					compiler.run(function(err, stats) {
						if(err) throw err;
						var currentHash1 = stats.toJson().hash;
						fs.writeFileSync(statsFile2, stats.toString());
						currentHash1.should.not.be.eql(lastHash1, "hash shouldn't change to the first hash if bundle changed back to first bundle");
						fs.writeFileSync(entryFile, "2", "utf-8");
						compiler.run(function(err, stats) {
							if(err) throw err;
							var currentHash2 = stats.toJson().hash;
							fs.writeFileSync(statsFile1, stats.toString());
							compiler.run(function(err, stats) {
								if(err) throw err;
								stats.toJson().hash.should.be.eql(currentHash2);
								currentHash2.should.not.be.eql(lastHash2);
								currentHash1.should.not.be.eql(currentHash2);
								lastHash1.should.not.be.eql(lastHash2);
								done();
							});
						});
					});
				});
			});
		});
	});
});
