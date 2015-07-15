var beautify = require("js-beautify").js_beautify;
var fs = require("fs");
var path = require("path");
var glob = require("glob");
var async = require("async");
var config = require("./config").beautify;

var options = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", ".jsbeautifyrc"), "utf-8")).js;

module.exports = function forEachBeautifiedFile(fn, callback) {

	glob(config.files, {
		cwd: path.resolve(__dirname, "..")
	}, function(err, files) {
		if(err) return callback(err);
		async.eachLimit(files, 50, function(file, callback) {
			var absPath = path.resolve(__dirname, "..", file);
			fs.readFile(absPath, "utf-8", function(err, content) {
				if(err) return callback(err);
				var beautifiedContent = beautify(content, options);
				fn({
					file: file,
					path: absPath,
					content: content,
					beautifiedContent: beautifiedContent
				}, callback);
			});
		}, function(err) {
			if(err) return callback(err);
			callback();
		});
	})

};
