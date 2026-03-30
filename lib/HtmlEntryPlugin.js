"use strict";

const EntryDependency = require("./dependencies/EntryDependency");

/** @typedef {import("./Compiler")} Compiler */

class HtmlEntryPlugin {
  /**
   * @param {string} context context path
   * @param {string} entry entry path (.html file)
   * @param {object} options entry options
   */
  constructor(context, entry, options) {
    this.context = context;
    this.entry = entry;
    this.options = options || {};
  }

  /** @param {Compiler} compiler */
  apply(compiler) {
    compiler.hooks.make.tapAsync("HtmlEntryPlugin", (compilation, callback) => {
      // Scaffold: using EntryDependency as placeholder.
      // Will be replaced with HtmlDependency once HtmlModuleFactory
      // and HtmlParser are implemented.
      // See: https://github.com/webpack/webpack/issues/536
      const dep = new EntryDependency(this.entry);
      dep.loc = { name: this.entry };
      compilation.addEntry(this.context, dep, this.options, callback);
    });
  }
}

module.exports = HtmlEntryPlugin;
