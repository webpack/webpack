var should = require("should");
var path = require("path");
var fs = require("fs");

var webpack = require("../");

describe("HotModuleReplacementPlugin", function() {
	it("should not have circular hashes but equal if unmodified", function(done) {
		var entryFile = path.join(__dirname, "js", "entry.js");
		var recordsFile = path.join(__dirname, "js", "records.json");
		try { fs.mkdirSync(path.join(__dirname, "js")); } catch(e) {}
		try { fs.unlinkSync(recordsFile); } catch(e) {}
		var compiler = webpack({
			cache: false,
			entry: entryFile,
			recordsPath: recordsFile,
			output: {
				path: path.join(__dirname, "js")
			},
			plugins: [
				new webpack.HotModuleReplacementPlugin(),
				new webpack.optimize.OccurenceOrderPlugin()
			]
		});
		fs.writeFileSync(entryFile, "1", "utf-8");
		compiler.run(function(err, stats) {
			if(err) throw err;
			var oldHash1 = stats.toJson().hash;
			compiler.run(function(err, stats) {
				if(err) throw err;
				var lastHash1 = stats.toJson().hash;
				lastHash1.should.be.eql(oldHash1);
				fs.writeFileSync(entryFile, "2", "utf-8");
				compiler.run(function(err, stats) {
					if(err) throw err;
					var lastHash2 = stats.toJson().hash;
					lastHash2.should.not.be.eql(lastHash1);
					fs.writeFileSync(entryFile, "1", "utf-8");
					compiler.run(function(err, stats) {
						if(err) throw err;
						var currentHash1 = stats.toJson().hash;
						currentHash1.should.not.be.eql(lastHash1);
						fs.writeFileSync(entryFile, "2", "utf-8");
						compiler.run(function(err, stats) {
							if(err) throw err;
							var currentHash2 = stats.toJson().hash;
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