# When to use this example

Webpack 5 includes a built-in TypeScript transform via
`experiments.typescript: true` (see the `examples/typescript` example).
That transform uses Node.js's `module.stripTypeScriptTypes` and therefore
only handles the **erasable** TypeScript subset — types, `import type`,
`as`-casts, generics, etc. It rejects syntax that emits runtime code:
`enum`, `namespace`, parameter-property constructors, `export =`, decorator
metadata, JSX/`.tsx`.

If your project uses any of that non-erasable syntax, keep using a real
TypeScript transpiler. This example shows the classic setup with
`ts-loader` plus `fork-ts-checker-webpack-plugin` for type checking.

# example.js

```javascript
console.log(require("./index"));
```

# index.ts

```typescript
// This example uses syntax that Node.js's built-in `stripTypeScriptTypes`
// rejects (enums, parameter-property constructors, namespaces) — i.e. it
// goes beyond the "erasable" subset enforced by tsconfig's
// `erasableSyntaxOnly`. Projects that rely on these features still need a
// real TypeScript transpiler such as `ts-loader` or `swc-loader`.

enum Role {
	Admin = "admin",
	Editor = "editor",
	Viewer = "viewer"
}

class User {
	constructor(
		public readonly name: string,
		public readonly role: Role
	) {}

	describe(): string {
		return `${this.name} (${this.role})`;
	}
}

function asArray<T>(...items: T[]): T[] {
	return [...items];
}

const users = asArray(
	new User("Alice", Role.Admin),
	new User("Bob", Role.Viewer)
);

for (const user of users) {
	console.log(user.describe());
}
```

# webpack.config.js

```javascript
"use strict";

const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

/** @type {(env: "development" | "production") => import("webpack").Configuration} */
const config = (env = "development") => ({
	mode: env,
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				loader: "ts-loader",
				options: {
					transpileOnly: true
				}
			}
		]
	},
	resolve: {
		extensions: [".ts", ".js", ".json"]
	},
	plugins: [new ForkTsCheckerWebpackPlugin({ async: env === "production" })]
});

module.exports = config;
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/*!******************!*\
  !*** ./index.ts ***!
  \******************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements:  */
/***/ (() => {

"use strict";

// This example uses syntax that Node.js's built-in `stripTypeScriptTypes`
// rejects (enums, parameter-property constructors, namespaces) — i.e. it
// goes beyond the "erasable" subset enforced by tsconfig's
// `erasableSyntaxOnly`. Projects that rely on these features still need a
// real TypeScript transpiler such as `ts-loader` or `swc-loader`.
var Role;
(function (Role) {
    Role["Admin"] = "admin";
    Role["Editor"] = "editor";
    Role["Viewer"] = "viewer";
})(Role || (Role = {}));
class User {
    name;
    role;
    constructor(name, role) {
        this.name = name;
        this.role = role;
    }
    describe() {
        return `${this.name} (${this.role})`;
    }
}
function asArray(...items) {
    return [...items];
}
const users = asArray(new User("Alice", Role.Admin), new User("Bob", Role.Viewer));
for (const user of users) {
    console.log(user.describe());
}


/***/ })
/******/ 	]);
```

<details><summary><code>/* webpack runtime code */</code></summary>

``` js
/************************************************************************/
/******/ 	// The module cache
/******/ 	const __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		const cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		const module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
```

</details>

``` js
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements: __webpack_require__ */
console.log(__webpack_require__(/*! ./index */ 1));

})();

/******/ })()
;
```

# Info

## Unoptimized

```
asset output.js 2.51 KiB [emitted] (name: main)
chunk (runtime: main) output.js (main) 939 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 906 bytes [dependent] 1 module
  ./example.js 33 bytes [built] [code generated]
    [used exports unknown]
    entry ./example.js main
webpack X.X.X compiled successfully
```

## Production mode

```
asset output.js 505 bytes [emitted] [minimized] (name: main)
chunk (runtime: main) output.js (main) 939 bytes [entry] [rendered]
  > ./example.js main
  dependent modules 906 bytes [dependent] 1 module
  ./example.js 33 bytes [built] [code generated]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully
```
