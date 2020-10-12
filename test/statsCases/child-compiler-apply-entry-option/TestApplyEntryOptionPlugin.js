"use strict";

var EntryOptionPlugin = require("../../../").EntryOptionPlugin;
var WebpackOptionsDefaulter = require("../../../").WebpackOptionsDefaulter;

/**
 * Use the static method in EntryOptionPlugin to
 * apply entry option for the child compiler.
 */

module.exports = class TestApplyEntryOptionPlugin {
  constructor(options) {
    this.options = new WebpackOptionsDefaulter().process({
      ...options
    });
  }

  apply(compiler) {
    compiler.hooks.make.tapAsync(
      "TestApplyEntryOptionPlugin",
      (compilation, cb) => {
        const child = compilation.createChildCompiler("TestApplyEntryOptionPlugin");
        EntryOptionPlugin.applyEntryOption(child, compilation.compiler.context, this.options.entry);
        child.runAsChild(cb)
      }
    )
  }
}