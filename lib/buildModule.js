var fs = require("fs");
var parse = require("./parse");
var execLoaders = require("enhanced-require/lib/execLoaders");

function buildModule(context, filenameWithLoaders,
					preLoaders, loaders, postLoaders,
					filename,
					options, callback) {

	if(options.profile) var profile = {
		start: new Date().getTime()
	}

	var dependencyInfo = {
		cacheable: true,
		files: [filename]
	}

	fs.readFile(filename, function(err, content) {
		if(err) return callback(err, null, null, dependencyInfo);

		profile && (profile.readEnd = new Date().getTime());

		var loaderContext = {
			loaders: loaders,
			preLoaders: preLoaders,
			postLoaders: postLoaders,
			loaderType: null
		};

		loaderContext.loaderType = "preLoader";
		execLoaders(context, filenameWithLoaders, preLoaders, [filename], [content], loaderContext, dependencyInfo, options,
		  function(err, result) {
			if(err) return callback(err, null, null, dependencyInfo);
			profile && (profile.preLoadersEnd = new Date().getTime());
			loaderContext.loaderType = "loader";
			execLoaders(context, filenameWithLoaders, loaders, [filename], result, loaderContext, dependencyInfo, options,
			  function(err, result) {
				if(err) return callback(err, null, null, dependencyInfo);
				profile && (profile.loadersEnd = new Date().getTime());
				loaderContext.loaderType = "postLoader";
				execLoaders(context, filenameWithLoaders, postLoaders, [filename], result, loaderContext, dependencyInfo, options,
				  function(err, result) {
					if(err) return callback(err, null, null, dependencyInfo);
					profile && (profile.postLoadersEnd = new Date().getTime());
					return processJs(result)
				});
			});
		});
	});

	// process the result delivered from loaders or direct from file
	// for inclusion into the result
	// (static code analysis for requires and other stuff)
	// [this step is cached]
	function processJs(resultBuffers) {
		var source = resultBuffers[0].toString("utf-8");
		var deps;
		try {
			deps = parse(source, options.parse);
		} catch(e) {
			callback(new Error("File \"" + filenameWithLoaders + "\" parsing failed: " + e), null, null, dependencyInfo);
			return;
		}
		profile && (profile.end = new Date().getTime());
		return callback(null, source, deps, dependencyInfo, profile);
	}
}
module.exports = buildModule;