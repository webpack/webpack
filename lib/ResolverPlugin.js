/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function ResolverPlugin(plugins, types) {
	if(!Array.isArray(plugins)) plugins = [plugins];
	if(!types) types = ["normal"];
	else if(!Array.isArray(types)) types = [types];

	this.plugins = plugins;
	this.types = types;
}
module.exports = ResolverPlugin;

ResolverPlugin.prototype.apply = function(compiler) {
	this.types.forEach(function(type) {
		this.plugins.forEach(function(plugin) {
			compiler.resolvers[type].apply(plugin);
		});
	}, this);
};

ResolverPlugin.UnsafeCachePlugin = require("enhanced-resolve/lib/UnsafeCachePlugin");
ResolverPlugin.ModulesInDirectoriesPlugin = require("enhanced-resolve/lib/ModulesInDirectoriesPlugin");
ResolverPlugin.ModulesInRootPlugin = require("enhanced-resolve/lib/ModulesInRootPlugin");
ResolverPlugin.ModuleTemplatesPlugin = require("enhanced-resolve/lib/ModuleTemplatesPlugin");
ResolverPlugin.ModuleAsFilePlugin = require("enhanced-resolve/lib/ModuleAsFilePlugin");
ResolverPlugin.ModuleAsDirectoryPlugin = require("enhanced-resolve/lib/ModuleAsDirectoryPlugin");
ResolverPlugin.ModuleAliasPlugin = require("enhanced-resolve/lib/ModuleAliasPlugin");
ResolverPlugin.DirectoryDefaultFilePlugin = require("enhanced-resolve/lib/DirectoryDefaultFilePlugin");
ResolverPlugin.DirectoryDescriptionFilePlugin = require("enhanced-resolve/lib/DirectoryDescriptionFilePlugin");
ResolverPlugin.FileAppendPlugin = require("enhanced-resolve/lib/FileAppendPlugin");
ResolverPlugin.DirectoryResultPlugin = require("enhanced-resolve/lib/DirectoryResultPlugin");
