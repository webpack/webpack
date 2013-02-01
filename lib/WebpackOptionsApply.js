/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var OptionsApply = require("./OptionsApply");

var FunctionModulePlugin = require("./FunctionModulePlugin");
var JsonpTemplatePlugin = require("./JsonpTemplatePlugin");
var EvalDevToolModulePlugin = require("./EvalDevToolModulePlugin");
var LibraryTemplatePlugin = require("./LibraryTemplatePlugin");

var SingleEntryPlugin = require("./SingleEntryPlugin");
var MultiEntryPlugin = require("./MultiEntryPlugin");
var CachePlugin = require("./CachePlugin");

var UglifyJsPlugin = require("./optimize/UglifyJsPlugin");

var ConsolePlugin = require("./ConsolePlugin");
var APIPlugin = require("./APIPlugin");
var ConstPlugin = require("./ConstPlugin");
var CompatibilityPlugin = require("./CompatibilityPlugin");

var CommonJsPlugin = require("./dependencies/CommonJsPlugin");
var AMDPlugin = require("./dependencies/AMDPlugin");
var RequireContextPlugin = require("./dependencies/RequireContextPlugin");
var RequireEnsurePlugin = require("./dependencies/RequireEnsurePlugin");

var LimitChunkCountPlugin = require("./optimize/LimitChunkCountPlugin");
var RemoveParentModulesPlugin = require("./optimize/RemoveParentModulesPlugin");
var RemoveEmptyChunksPlugin = require("./optimize/RemoveEmptyChunksPlugin");
var MergeDuplicateChunksPlugin = require("./optimize/MergeDuplicateChunksPlugin");

var ModulesInDirectoriesPlugin = require("enhanced-resolve/lib/ModulesInDirectoriesPlugin");
var ModuleTemplatesPlugin = require("enhanced-resolve/lib/ModuleTemplatesPlugin");
var ModuleAsFilePlugin = require("enhanced-resolve/lib/ModuleAsFilePlugin");
var ModuleAsDirectoryPlugin = require("enhanced-resolve/lib/ModuleAsDirectoryPlugin");
var ModuleAliasPlugin = require("enhanced-resolve/lib/ModuleAliasPlugin");
var DirectoryDefaultFilePlugin = require("enhanced-resolve/lib/DirectoryDefaultFilePlugin");
var DirectoryDescriptionFilePlugin = require("enhanced-resolve/lib/DirectoryDescriptionFilePlugin");
var FileAppendPlugin = require("enhanced-resolve/lib/FileAppendPlugin");
var DirectoryResultPlugin = require("enhanced-resolve/lib/DirectoryResultPlugin");


function WebpackOptionsApply() {
	OptionsApply.call(this);
}
module.exports = WebpackOptionsApply;

WebpackOptionsApply.prototype = Object.create(OptionsApply.prototype);
WebpackOptionsApply.prototype.process = function(options, compiler) {
	if(options.plugins && Array.isArray(options.plugins)) {
		compiler.apply.apply(compiler, options.plugins);
	}
	compiler.outputPath = options.output.path;
	compiler.apply(
		new JsonpTemplatePlugin(options.output),
		new FunctionModulePlugin(options.context, options.output)
	);
	if(options.output.library || options.output.libraryTarget != "var")
		compiler.apply(new LibraryTemplatePlugin(options.output.library, options.output.libraryTarget));
	if(options.devtool == "eval")
		compiler.apply(new EvalDevToolModulePlugin());
	function itemToPlugin(item, name) {
		if(Array.isArray(item))
			return new MultiEntryPlugin(options.context, item, name);
		else
			return new SingleEntryPlugin(options.context, item, name)
	}
	if(typeof options.entry == "string" || Array.isArray(options.entry)) {
		compiler.apply(itemToPlugin(options.entry, "main"));
	} else if(typeof options.entry == "object") {
		Object.keys(options.entry).forEach(function(name) {
			compiler.apply(itemToPlugin(options.entry[name], name));
		});
	}
	compiler.apply(
		new CompatibilityPlugin(),
		new APIPlugin(),
		new ConstPlugin(),
		new RequireEnsurePlugin(),
		new RequireContextPlugin(options.resolve.modulesDirectories, options.resolve.extensions),
		new AMDPlugin(options.amd || {}),
		new CommonJsPlugin()
	);
	if(options.console)
		compiler.apply(new ConsolePlugin());

	compiler.apply(
		new RemoveParentModulesPlugin(),
		new RemoveEmptyChunksPlugin(),
		new MergeDuplicateChunksPlugin()
	);
	if(options.optimize && options.optimize.maxChunks)
		compiler.apply(new LimitChunkCountPlugin(options.optimize));

	if(options.optimize.minimize === true)
		compiler.apply(new UglifyJsPlugin());
	else if(options.optimize.minimize)
		compiler.apply(new UglifyJsPlugin(options.optimize.minimize));

	if(options.cache === undefined ? options.watch : options.cache)
		compiler.apply(new CachePlugin(typeof options.cache == "object" ? options.cache : null));

	compiler.applyPlugins("after-plugins", compiler);
	compiler.resolvers.normal.apply(
		new ModuleAliasPlugin(options.resolve.alias),
		new ModulesInDirectoriesPlugin("module", options.resolve.modulesDirectories),
		new ModuleAsFilePlugin("module"),
		new ModuleAsDirectoryPlugin("module"),
		new DirectoryDescriptionFilePlugin("package.json", ["webpack", "browserify", "web", ["jam", "main"], "main"]),
		new DirectoryDefaultFilePlugin(["index"]),
		new FileAppendPlugin(options.resolve.extensions)
	);
	compiler.resolvers.context.apply(
		new ModuleAliasPlugin(options.resolve.alias),
		new ModulesInDirectoriesPlugin("module", options.resolve.modulesDirectories),
		new ModuleAsFilePlugin("module"),
		new ModuleAsDirectoryPlugin("module"),
		new DirectoryResultPlugin()
	);
	compiler.resolvers.loader.apply(
		new ModuleAliasPlugin(options.resolveLoader.alias),
		new ModulesInDirectoriesPlugin("loader-module", options.resolveLoader.modulesDirectories),
		new ModuleTemplatesPlugin("loader-module", options.resolveLoader.moduleTemplates, "module"),
		new ModuleAsFilePlugin("module"),
		new ModuleAsDirectoryPlugin("module"),
		new DirectoryDescriptionFilePlugin("package.json", ["webpackLoader", "webLoader", "loader", "main"]),
		new DirectoryDefaultFilePlugin(["index"]),
		new FileAppendPlugin(options.resolveLoader.extensions)
	);
	compiler.applyPlugins("after-resolvers", compiler);
	return options;
}