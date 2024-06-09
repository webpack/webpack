const { interpolateName } = require("loader-utils");

module.exports = {
  createResolve,
};

function createResolve(loader) {
  return function resolve(request) {
    return new Promise((resolve, reject) => {
      loader.resolve(loader.context, request, (error, inputFilePath) => {
        if (error) {
          reject(error);

          return;
        }

        loader.addDependency(inputFilePath);
        loader.loadModule(inputFilePath, (error, source, sourceMap) => {
          if (error) {
            reject(error);

            return;
          }

          let {
            assetModuleFilename,
            hashDigest,
            hashDigestLength,
            hashFunction,
          } = loader._compilation.outputOptions;

          assetModuleFilename = assetModuleFilename.replace(
            /\[ext\]/gi,
            ".[ext]",
          );
          assetModuleFilename = assetModuleFilename.replace(
            /\[(?:([^:\]]+):)?(hash|contenthash)(?::([a-z]+\d*))?(?::(\d+))?\]/gi,
            (
              _,
              fn = hashFunction,
              type,
              digest = hashDigest,
              length = hashDigestLength,
            ) => {
              return `[${fn}:${type}:${digest}:${length}]`;
            },
          );

          const outputFilePath = interpolateName(
            {
              resourcePath: inputFilePath,
            },
            assetModuleFilename,
            {
              context: loader.context,
              content: source,
            },
          );

          loader.emitFile(outputFilePath, source, sourceMap);

          resolve(outputFilePath);
        });
      });
    });
  };
}
