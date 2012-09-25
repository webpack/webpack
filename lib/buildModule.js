var fs = require("fs");
var parse = require("./parse");
var execLoaders = require("enhanced-require/lib/execLoaders");

function buildModule(parameters, callback) {

	var context				= parameters.context;
	var filenameWithLoaders	= parameters.filenameWithLoaders;
	var preLoaders			= parameters.preLoaders;
	var loaders				= parameters.loaders;
	var postLoaders			= parameters.postLoaders;
	var filename			= parameters.filename;
	var options				= parameters.options;

	if(options.profile) var profile = {
		start: new Date().getTime()
	}

	var dependencyInfo = {
		cacheable: true,
		files: [filename]
	}
	var cacheEntry = parameters.cacheEntry || {
		add: function(file) {
			dependencyInfo.files.push(file);
		},
		clear: function() {
			dependencyInfo.files = [];
		}
	};

	fs.readFile(filename, function(err, content) {
		if(err) return callback(err);

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
			if(err) return callback(err);
			profile && (profile.preLoadersEnd = new Date().getTime());
			loaderContext.loaderType = "loader";
			execLoaders(context, filenameWithLoaders, loaders, [filename], result, loaderContext, dependencyInfo, options,
			  function(err, result) {
				if(err) return callback(err);
				profile && (profile.loadersEnd = new Date().getTime());
				loaderContext.loaderType = "postLoader";
				execLoaders(context, filenameWithLoaders, postLoaders, [filename], result, loaderContext, dependencyInfo, options,
				  function(err, result) {
					if(err) return callback(err);
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
			callback(new Error("File \"" + filenameWithLoaders + "\" parsing failed: " + e));
			return;
		}
		profile && (profile.end = new Date().getTime());
		return callback(null, source, deps, dependencyInfo, profile);
	}
}
module.exports = buildModule;