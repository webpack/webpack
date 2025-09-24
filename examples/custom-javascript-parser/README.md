# example.js

```javascript
import { increment as inc } from './increment';
var a = 1;
inc(a); // 2

// async loading
import("./async-loaded").then(function(asyncLoaded) {
	console.log(asyncLoaded);
});
```

# increment.js

```javascript
import { add } from './math';
export function increment(val) {
    return add(val, 1);
};
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements:  */
/***/ (() => {

throw new Error("Module parse failed: [1:7-1:8]: The import keyword can only be used with the module goal\nYou may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders\nSyntaxError: [1:7-1:8]: The import keyword can only be used with the module goal\n    at Parser.report (file://(webpack)/node_modules/meriyah/dist/meriyah.mjs:4805:15)\n    at parseStatementListItem (file://(webpack)/node_modules/meriyah/dist/meriyah.mjs:4981:28)\n    at parseStatementList (file://(webpack)/node_modules/meriyah/dist/meriyah.mjs:4919:25)\n    at parseSource (file://(webpack)/node_modules/meriyah/dist/meriyah.mjs:4892:16)\n    at Module.parse (file://(webpack)/node_modules/meriyah/dist/meriyah.mjs:9196:12)\n    at Object.parse (./webpack.config.js:14:21)\n    at JavascriptParser.parse ((webpack)/lib/javascript/JavascriptParser.js:4615:21)\n    at (webpack)/lib/NormalModule.js:1405:19\n    at processResult ((webpack)/lib/NormalModule.js:987:11)\n    at (webpack)/lib/NormalModule.js:1137:5");

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module doesn't tell about it's top-level declarations so it can't be inlined
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__[0]();
/******/ 	
/******/ })()
;
```

# Info

## Unoptimized

```
{
  sourceType: 'auto',
  onComment: [],
  onInsertedSemicolon: [Function: onInsertedSemicolon]
}
asset output.js 2.04 KiB [emitted] (name: main)
chunk (runtime: main) output.js (main) 175 bytes [entry] [rendered]
  > ./example.js main
  ./example.js 175 bytes [built] [code generated] [1 error]
    [used exports unknown]
    entry ./example.js main

ERROR in ./example.js
Module parse failed: [1:7-1:8]: The import keyword can only be used with the module goal
You may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders
SyntaxError: [1:7-1:8]: The import keyword can only be used with the module goal
    at Parser.report (file://(webpack)/node_modules/meriyah/dist/meriyah.mjs:4805:15)
    at parseStatementListItem (file://(webpack)/node_modules/meriyah/dist/meriyah.mjs:4981:28)
    at parseStatementList (file://(webpack)/node_modules/meriyah/dist/meriyah.mjs:4919:25)
    at parseSource (file://(webpack)/node_modules/meriyah/dist/meriyah.mjs:4892:16)
    at Module.parse (file://(webpack)/node_modules/meriyah/dist/meriyah.mjs:9196:12)
    at Object.parse (./webpack.config.js:14:21)
    at JavascriptParser.parse ((webpack)/lib/javascript/JavascriptParser.js:4615:21)
    at (webpack)/lib/NormalModule.js:1405:19
    at processResult ((webpack)/lib/NormalModule.js:987:11)
    at (webpack)/lib/NormalModule.js:1137:5

webpack X.X.X compiled with 1 error
```

## Production mode

```
{
  sourceType: 'auto',
  onComment: [],
  onInsertedSemicolon: [Function: onInsertedSemicolon]
}
assets by status 1.43 KiB [cached] 1 asset
chunk (runtime: main) output.js (main) 175 bytes [entry] [rendered]
  > ./example.js main
  ./example.js 175 bytes [built] [code generated] [1 error]
    [no exports used]
    entry ./example.js main

ERROR in ./example.js
Module parse failed: [1:7-1:8]: The import keyword can only be used with the module goal
You may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders
SyntaxError: [1:7-1:8]: The import keyword can only be used with the module goal
    at Parser.report (file://(webpack)/node_modules/meriyah/dist/meriyah.mjs:4805:15)
    at parseStatementListItem (file://(webpack)/node_modules/meriyah/dist/meriyah.mjs:4981:28)
    at parseStatementList (file://(webpack)/node_modules/meriyah/dist/meriyah.mjs:4919:25)
    at parseSource (file://(webpack)/node_modules/meriyah/dist/meriyah.mjs:4892:16)
    at Module.parse (file://(webpack)/node_modules/meriyah/dist/meriyah.mjs:9196:12)
    at Object.parse (./webpack.config.js:14:21)
    at JavascriptParser.parse ((webpack)/lib/javascript/JavascriptParser.js:4615:21)
    at (webpack)/lib/NormalModule.js:1405:19
    at processResult ((webpack)/lib/NormalModule.js:987:11)
    at (webpack)/lib/NormalModule.js:1137:5

webpack X.X.X compiled with 1 error
```
