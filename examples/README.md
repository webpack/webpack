# Examples
## Aggressive Merging
[aggressive-merging](aggressive-merging) 

## Chunk
[chunkhash](chunkhash)

[common-chunk-and-vendor-chunk](common-chunk-and-vendor-chunk)

[explicit-vendor-chunk](explicit-vendor-chunk)

[extra-async-chunk-advanced](extra-async-chunk-advanced)

[extra-async-chunk](extra-async-chunk)

[code-splitting-specify-chunk-name](code-splitting-specify-chunk-name)

[move-to-parent](move-to-parent)

[multiple-commons-chunks](multiple-commons-chunks)

[multiple-entry-points-commons-chunk-css-bundle](multiple-entry-points-commons-chunk-css-bundle)

[named-chunks](named-chunks) example demonstrating merging of chunks with named chunks

[two-explicit-vendor-chunks](two-explicit-vendor-chunks)

## Code Splitted
[code-splitted-css-bundle](code-splitted-css-bundle)

[code-splitted-require.context-amd](code-splitted-require.context-amd) example demonstrating contexts in a code-split environment with AMD.

[code-splitted-require.context](code-splitted-require.context) example demonstrating contexts in a code-split environment.

## Code Splitting
[code-splitting](code-splitting) example demonstrating a very simple case of Code Splitting.

[code-splitting-bundle-loader](code-splitting-bundle-loader) example demonstrating Code Splitting through the builder loader

[code-splitting-harmony](code-splitting-harmony) 

[code-splitting-native-import-context](code-splitting-native-import-context) 

[code-splitting-specify-chunk-name](code-splitting-specify-chunk-name)

## Coffee Script
[coffee-script](coffee-script) example demonstrating code written in coffee-script.

## CommonJS
[commonjs](commonjs) example demonstrating a very simple program

## Css Bundle
[css-bundle](css-bundle)

[multiple-entry-points-commons-chunk-css-bundle](multiple-entry-points-commons-chunk-css-bundle)

## DLL
[dll](dll)

[dll-user](dll-user)

## Externals
[externals](externals)

## Harmony
[harmony](harmony)

[code-splitting-harmony](code-splitting-harmony)

[harmony-interop](harmony-interop)

[harmony-library](harmony-library)

[harmony-unused](harmony-unused)

## HTTP2 Aggressive Splitting
[http2-aggressive-splitting](http2-aggressive-splitting)

## Hybrid Routing
[hybrid-routing](hybrid-routing)

## i18n
[i18n](i18n) example demonstrating localization.

## Loader
[loader](loader) example demonstrating the usage of loaders.

## Mixed
[mixed](mixed) example demonstrating mixing CommonJs and AMD

## Multi Compiler
[multi-compiler](multi-compiler)

## Multi Part Library
[multi-part-library](multi-part-library)

## Multiple Entry Points
[multiple-entry-points](multiple-entry-points) example demonstrating multiple entry points with Code Splitting.

## Require Context
[require.context](require.context) example demonstrating automatic creation of contexts when using variables in `require`.

## Require Resolve
[require.resolve](require.resolve) example demonstrating how to cache clearing of modules with `require.resolve` and `require.cache`.

## Scope Hoisting
[scope-hoisting](scope-hoisting)

## Side Effects
[side-effects](side-effects)

## Source Map
[source-map](source-map)

## Web Worker
[web-worker](web-worker) example demonstrating creating WebWorkers with webpack and the worker-loader.


# Requests
If you think an example is missing, please report it as issue. :)

# Building an Example
1. Run `yarn` in the root of the project.
2. Run `yarn link webpack` in the root of the project.
3. Run `yarn add --dev webpack-cli` in the root of the project.
4. Run `node build.js` in the specific example directory. (Ex: `cd examples/commonjs && node build.js`)

Note: To build all examples run `npm run build:examples`
