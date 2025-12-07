"use strict";

class RemoveUnusedAssetsPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap(
      "RemoveUnusedAssets",
      (compilation) => {
        compilation.hooks.optimizeAssets.tap(
          {name: "RemoveUnusedAssets", stage: 999},
          (assets) => {
            const usedAssets = new Set();
            for (const module of compilation.modules) {
              if(!module.source) continue;
              const src = module.source.source().toString();
              for (const assetName in assets) {
                if (src.includes(assetName)) {
                  usedAssets.add(assetName);
                }
              }
            }
            for (const assetName in assets) {
              if (!usedAssets.has(assetName)) {
                delete assets[assetName];
              }
            }
          }
        );
      }
    );
  }
}

module.exports = RemoveUnusedAssetsPlugin;
