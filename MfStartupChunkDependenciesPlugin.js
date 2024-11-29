class MfStartupChunkDependenciesPlugin {
    apply(compiler) {
      compiler.hooks.compilation.tap('MfStartupChunkDependenciesPlugin', (compilation) => {
        compilation.hooks.additionalChunkRuntimeRequirements.tap(
          'MfStartupChunkDependenciesPlugin',
          (chunk, set, { chunkGraph }) => {
            if (!isEnabledForChunk(chunk)) return;
            if (chunkGraph.getNumberOfEntryModules(chunk) === 0) return;
            set.add(federationStartup);
          }
        );
      });
    }
  }
  
  module.exports = MfStartupChunkDependenciesPlugin;
  