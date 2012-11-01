/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var fs = require("fs");
var parse = require("./parse");
var resolve = require("enhanced-resolve");
var execLoaders = require("enhanced-require/lib/execLoaders");

function buildModule(context, request,
					preLoaders, loaders, postLoaders,
					requestObj,
					options, callback) {

	if(options.profile) var profile = {
		start: new Date().getTime()
	}

	var files = requestObj.resource && requestObj.resource.path && [requestObj.resource.path] || []
	var dependencyInfo = {
		cacheable: true,
		files: files.slice(0)
	};

	var extraResults = {
		dependencyInfo: dependencyInfo,
		profile: profile,
		warnings: [],
		errors: []
	}

	if(requestObj.resource && requestObj.resource.path)
		fs.readFile(requestObj.resource.path, onFileRead);
	else
		onFileRead(null, null);

	function onFileRead(err, content) {
		if(err) return callback(err, extraResults);

		profile && (profile.readEnd = new Date().getTime());

		var loaderContext = {
			loaders: loaders.map(resolve.stringify.part),
			preLoaders: preLoaders.map(resolve.stringify.part),
			postLoaders: postLoaders.map(resolve.stringify.part),
			loaderType: null,
			emitWarning: function(warning) {
				extraResults.warnings.push(warning);
			},
			emitError: function(error) {
				extraResults.errors.push(error);
			}
		};
		if(requestObj.resource)
			loaderContext.resourceQuery = requestObj.resource.query;

		loaderContext.loaderType = "preLoader";
		execLoaders(context, request, preLoaders, files, [content], loaderContext, dependencyInfo, options,
		  function(err, result) {
			if(err) return callback(err, extraResults);
			profile && (profile.preLoadersEnd = new Date().getTime());
			loaderContext.loaderType = "loader";
			execLoaders(context, request, loaders, files, result, loaderContext, dependencyInfo, options,
			  function(err, result) {
				if(err) return callback(err, extraResults);
				profile && (profile.loadersEnd = new Date().getTime());
				loaderContext.loaderType = "postLoader";
				execLoaders(context, request, postLoaders, files, result, loaderContext, dependencyInfo, options,
				  function(err, result) {
					if(err) return callback(err, extraResults);
					profile && (profile.postLoadersEnd = new Date().getTime());
					return processJs(result)
				});
			});
		});
	}

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
			callback(new Error("File \"" + request + "\" parsing failed: " + e), extraResults);
			return;
		}
		profile && (profile.end = new Date().getTime());
		return callback(null, extraResults, source, deps);
	}
}
module.exports = buildModule;