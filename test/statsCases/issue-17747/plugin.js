module.exports = function Issue17747Plugin() {
  const loaderPath = require.resolve("./loader.js");

  this.apply = (compiler) => {
    const { context, webpack } = compiler;
    const { EntryPlugin } = webpack;

    compiler.hooks.make.tapPromise("Issue17747Plugin", handleMake);

    async function handleMake(compilation) {
      const {outputOptions: { publicPath: optionsPublicPath }} = compilation;
      const publicPath = optionsPublicPath === "auto" ? "" : optionsPublicPath;
      const outputOptions = { filename: "[name]", publicPath };

      const childCompiler = compilation.createChildCompiler(
        "Issue17747PluginChildCompiler",
        outputOptions,
      );
      childCompiler.context = context;

      const load = new EntryPlugin(
        context,
        `!!${loaderPath}!./entry.json`,
        "issue-17747-chunk",
      );
      load.apply(childCompiler);

      const [, childCompilation] = await new Promise(
        (resolve, reject) => {
          childCompiler.runAsChild((error, ...args) => {
            error ? reject(error) : resolve(args);
          });
        },
      );

      if (childCompilation.errors.length > 0) {
        const errorDetails = childCompilation.errors
          .map(({ message, error }) => message + (error ? `:\n${error}` : ""))
          .join("\n");

        throw new Error(`Child compilation failed:\n${errorDetails}`);
      }
    }
  };
};
