"use strict";

/** @typedef {import("../../../").Configuration} Configuration */
/** @typedef {import("../../../").Compiler} Compiler */

var EntryOptionPlugin = require("../../../").EntryOptionPlugin;
var getNormalizedWebpackOptions = require("../../../").config.getNormalizedWebpackOptions;

/**
 * Use the static method in EntryOptionPlugin to
 * apply entry option for the child compiler.
 */
module.exports = class TestApplyEntryOptionPlugin {
	/**
	 * @param {Configuration} options options
	 */
  constructor(options) {
    this.options = getNormalizedWebpackOptions(options);
  }

	/**
	 * @param {Compiler} compiler compiler
	 */
  apply(compiler) {
    compiler.hooks.make.tapAsync(
      "TestApplyEntryOptionPlugin",
      (compilation, cb) => {
        const child = compilation.createChildCompiler("TestApplyEntryOptionPlugin");
        EntryOptionPlugin.applyEntryOption(child, compilation.compiler.context, this.options.entry);
        child.runAsChild(/** @type {EXPECTED_ANY} */ (cb))
      }
    )
  }
}
