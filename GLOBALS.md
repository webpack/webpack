# webpack/globals

This module exports webpack's internal global variables that are injected into bundles at runtime. These globals are used internally by webpack's runtime to manage module loading, code splitting, hot module replacement, and other runtime operations.

## Installation

`webpack/globals` is part of the webpack package and is available as a subpath export.

## Usage

### CommonJS

```javascript
const globals = require("webpack/globals");

console.log(globals.publicPath); // "__webpack_require__.p"
console.log(globals.require); // "__webpack_require__"
console.log(globals.exports); // "__webpack_exports__"
```

### ES Modules

```javascript
import * as globals from "webpack/globals";

console.log(globals.publicPath); // "__webpack_require__.p"
console.log(globals.require); // "__webpack_require__"
```

### Named Imports

```javascript
import { publicPath, require as webpackRequire, module } from "webpack/globals";

console.log(publicPath); // "__webpack_require__.p"
console.log(webpackRequire); // "__webpack_require__"
console.log(module); // "module"
```

## Available Globals

This module exports all runtime globals used by webpack. Each export is a string representing the name of the global variable as it appears in bundled code.

### Common Globals

- **`publicPath`** - The bundle's public path (`__webpack_require__.p`)
- **`require`** - The internal require function (`__webpack_require__`)
- **`exports`** - The internal exports object (`__webpack_exports__`)
- **`module`** - The module object (`module`)
- **`hasOwnProperty`** - Shorthand for Object.prototype.hasOwnProperty (`__webpack_require__.o`)
- **`definePropertyGetters`** - Define property getters (`__webpack_require__.d`)
- **`makeNamespaceObject`** - Create namespace objects (`__webpack_require__.r`)
- **`ensureChunk`** - Ensure a chunk is loaded (`__webpack_require__.e`)

### Module Management

- **`moduleCache`** - The module cache (`__webpack_require__.c`)
- **`moduleFactories`** - The module factories (`__webpack_require__.m`)
- **`moduleId`** - The current module ID (`module.id`)
- **`moduleLoaded`** - The module loaded flag (`module.loaded`)

### Runtime Information

- **`baseURI`** - The base URI of the document (`__webpack_require__.b`)
- **`global`** - Reference to the global object (`__webpack_require__.g`)
- **`runtimeId`** - The runtime ID (`__webpack_require__.j`)
- **`scriptNonce`** - The script nonce for CSP (`__webpack_require__.nc`)
- **`chunkCallback`** - The chunk callback function (`webpackChunk`)

### Hot Module Replacement

- **`hmrDownloadManifest`** - Download HMR manifest (`__webpack_require__.hmrM`)
- **`hmrDownloadUpdateHandlers`** - HMR update handlers (`__webpack_require__.hmrC`)
- **`hmrModuleData`** - HMR module data (`__webpack_require__.hmrD`)
- **`hmrRuntimeStatePrefix`** - HMR state prefix (`__webpack_require__.hmrS`)

### Code Splitting

- **`ensureChunkHandlers`** - Handlers for ensuring chunks (`__webpack_require__.f`)
- **`prefetchChunk`** - Prefetch a chunk (`__webpack_require__.E`)
- **`preloadChunk`** - Preload a chunk (`__webpack_require__.G`)
- **`onChunksLoaded`** - Register code to run when chunks are loaded (`__webpack_require__.O`)

### Module Federation

- **`shareScopeMap`** - Shared scope map for module federation (`__webpack_require__.S`)
- **`initializeSharing`** - Initialize sharing for module federation (`__webpack_require__.I`)
- **`currentRemoteGetScope`** - Current remote scope (`__webpack_require__.R`)

### WebAssembly

- **`instantiateWasm`** - Instantiate WASM instances (`__webpack_require__.v`)
- **`wasmInstances`** - WASM instances storage (`__webpack_require__.w`)

### Advanced

- **`createFakeNamespaceObject`** - Create fake namespace objects (`__webpack_require__.t`)
- **`compatGetDefaultExport`** - Compatibility for default exports (`__webpack_require__.n`)
- **`loadScript`** - Load a script tag (`__webpack_require__.l`)
- **`createScript`** - Create trusted script (`__webpack_require__.ts`)
- **`createScriptUrl`** - Create trusted script URL (`__webpack_require__.tu`)
- **`getTrustedTypesPolicy`** - Get Trusted Types policy (`__webpack_require__.tt`)

For a complete list of all available globals, see [lib/RuntimeGlobals.js](lib/RuntimeGlobals.js).

## TypeScript Support

This module includes full TypeScript definitions. All exported values are typed as strings:

```typescript
import { publicPath, require as webpackRequire } from "webpack/globals";

const path: string = publicPath;
const req: string = webpackRequire;
```

## Use Cases

### Custom Loaders

When creating custom loaders, you can reference these globals to interact with webpack's runtime:

```javascript
// custom-loader.js
const globals = require("webpack/globals");

module.exports = function(content) {
  return `
    const publicPath = ${globals.publicPath};
    const requireFn = ${globals.require};
    ${content}
  `;
};
```

### Plugins

Plugins can use these globals when generating runtime code:

```javascript
const { Compilation } = require("webpack");
const globals = require("webpack/globals");

class MyPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap("MyPlugin", (compilation) => {
      compilation.hooks.optimizeAssets.tap("MyPlugin", () => {
        // Use globals to generate runtime code
        const runtimeCode = `
          ${globals.require}.custom = function() { ... };
        `;
      });
    });
  }
}
```

### Runtime Introspection

In bundled code, you can use these globals to interact with webpack's runtime:

```javascript
// This code runs in the browser
const publicPath = window.__webpack_require__.p;
const modules = window.__webpack_require__.m;
```

## Compatibility

- **Node.js**: 10.13.0+
- **Bundlers**: Any webpack or webpack-compatible bundler

## ESLint Integration

When using ESLint with bundled code that references webpack globals, you may need to configure globals:

```javascript
// .eslintrc.js
module.exports = {
  globals: {
    __webpack_require__: "readonly",
    __webpack_public_path__: "writable",
    __webpack_modules__: "readonly",
    webpackChunk: "readonly",
  },
};
```

Or use the webpack/globals module to programmatically configure globals:

```javascript
const globals = require("webpack/globals");

const eslintGlobals = {
  __webpack_require__: "readonly",
  __webpack_public_path__: "writable",
  __webpack_modules__: "readonly",
  webpackChunk: "readonly",
};

module.exports = {
  globals: eslintGlobals,
};
```

## See Also

- [lib/RuntimeGlobals.js](lib/RuntimeGlobals.js) - Source of truth for all runtime globals
- [webpack Runtime Documentation](https://webpack.js.org/concepts/manifest/#runtime)
- [Code Splitting](https://webpack.js.org/guides/code-splitting/)
- [Module Federation](https://webpack.js.org/concepts/module-federation/)
