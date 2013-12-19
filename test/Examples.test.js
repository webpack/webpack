var should = require("should");
var path = require("path");
var fs = require("fs");
var webpack = require("../");

describe("Examples", function() {
	var examples = fs.readdirSync(path.join(__dirname, "..", "examples")).map(function(name) {
		return path.join(__dirname, "..", "examples", name);
	}).filter(function(p) {
		return fs.statSync(p).isDirectory();
	});

	examples.forEach(function(examplePath) {
		it("should compile " + path.basename(examplePath), function(done) {
			var options = {};
			if(fs.existsSync(path.join(examplePath, "webpack.config.js")))
				options = require(path.join(examplePath, "webpack.config.js"));
			options.context = examplePath;
			options.optimize = options.optimize || {};
			options.output = options.output || {};
			options.optimize.occurenceOrder = true;
			options.output.pathInfo = true;
			options.output.path = path.join(examplePath, "js");
			options.output.publicPath = "js/";
			if(!options.output.filename)
				options.output.filename = "output.js";
			if(!options.entry)
				options.entry = "./example.js";
			webpack(options, function(err, stats) {
				if(err) return done(err);
				stats = stats.toJson();
				if(stats.errors.length > 0)
					return done(stats.errors[0]);
				done();
			});
		});
	});
});