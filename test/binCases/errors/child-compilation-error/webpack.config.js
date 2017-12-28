"use strict";

module.exports = {
    entry: "./index",
    output: {
        filename: "bundle.js"
    },
    plugins: [{
        apply(compiler) {
            compiler.plugin("make", (compilation, cb) => {
                const child = compilation.createChildCompiler("child", {});
                child.plugin("compilation", childCompilation => {
                    childCompilation.errors.push(new Error("child compilation"));
                });
                child.runAsChild(cb);
            });
        }
    }]
};
