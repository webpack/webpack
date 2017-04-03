# examples

## [commonjs](commonjs)

example demonstrating a very simple program

## [code-splitting](code-splitting)

example demonstrating a very simple case of Code Splitting.

## [require.resolve](require.resolve)

example demonstrating how to cache clearing of modules with `require.resolve` and `require.cache`.

## [require.context](require.context)

example demonstrating automatic creation of contexts when using variables in `require`.

## [code-splitted-require.context](code-splitted-require.context)

example demonstrating contexts in a code-split environment.

## [code-splitted-require.context-amd](code-splitted-require.context-amd)

example demonstrating contexts in a code-split environment with AMD.

## [loader](loader)

example demonstrating the usage of loaders.

## [coffee-script](coffee-script)

example demonstrating code written in coffee-script.

## [code-splitting-bundle-loader](code-splitting-bundle-loader)

example demonstrating Code Splitting through the builder loader

## [names-chunks](names-chunks)

example demonstrating merging of chunks with named chunks

## [mixed](mixed)

example demonstrating mixing CommonJs and AMD

## [web-worker](web-worker)

example demonstrating creating WebWorkers with webpack and the worker-loader.

## [i18n](i18n)

example demonstrating localization.

## [multiple-entry-points](multiple-entry-points)

example demonstrating multiple entry points with Code Splitting.

# Requests

If you think an example is missing, please report it as issue. :)

# Building an Example

1. Run `npm install` in the root of the project.
2. Run `npm link webpack` in the root of the project.
3. Run `node build.js` in the specific example directory. (Ex: `cd examples/commonjs && node build.js`)

Note: To build all examples run `npm run build:examples`
