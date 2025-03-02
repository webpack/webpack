class StrictModeWarningPlugin {
    apply(compiler) {
      compiler.hooks.compilation.tap("StrictModeWarningPlugin", (compilation) => {
        compilation.hooks.optimizeModules.tap("StrictModeWarningPlugin", (modules) => {
          for (const module of modules) {
            if (module._source && module._source.source().includes('"use strict"')) {
              compilation.warnings.push(
                new Error(`Warning: Module ${module.identifier()} is converted to strict mode.`)
              );
            }
          }
        });
      });
    }
  }
  
  module.exports = StrictModeWarningPlugin;
  