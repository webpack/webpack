# example.js

```javascript
import { increment as inc, value } from "./counter";
import { resetCounter, print } from "./methods";
print(value);
inc();
inc();
inc();
print(value);
resetCounter();
print(value);

export { inc, print };
```

# methods.js

```javascript
export { reset as resetCounter } from "./counter";

export const print = value => console.log(value);
```

# counter.js

```javascript
export let value = 0;
export function increment() {
	value++;
}
export function decrement() {
	value--;
}
export function reset() {
	value = 0;
}
```

# dist/output.js

```javascript
/******/ "use strict";
/******/ // The require scope
/******/ var __webpack_require__ = {};
/******/ 
```

<details><summary><code>/* webpack runtime code */</code></summary>

``` js
/************************************************************************/
/******/ /* webpack/runtime/define property getters */
/******/ (() => {
/******/ 	// define getter functions for harmony exports
/******/ 	__webpack_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
/******/ 	__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ })();
/******/ 
/************************************************************************/
```

</details>

``` js
var __webpack_exports__ = {};
/*!********************************!*\
  !*** ./example.js + 2 modules ***!
  \********************************/
/*! namespace exports */
/*! export inc [provided] [used in main] [could be renamed] -> ./counter.js .increment */
/*! export print [provided] [used in main] [could be renamed] -> ./methods.js .print */
/*! runtime requirements: __webpack_exports__, __webpack_require__.d, __webpack_require__.* */

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "inc": () => (/* reexport */ increment),
  "print": () => (/* reexport */ print)
});

;// CONCATENATED MODULE: ./counter.js
let value = 0;
function increment() {
	value++;
}
function decrement() {
	value--;
}
function counter_reset() {
	value = 0;
}

;// CONCATENATED MODULE: ./methods.js


const print = value => console.log(value);

;// CONCATENATED MODULE: ./example.js


print(value);
increment();
increment();
increment();
print(value);
counter_reset();
print(value);



var __webpack_exports__inc = __webpack_exports__.inc;
var __webpack_exports__print = __webpack_exports__.print;
export { __webpack_exports__inc as inc, __webpack_exports__print as print };
```

# dist/output.js (production)

```javascript
var e={d:(o,r)=>{for(var t in r)e.o(r,t)&&!e.o(o,t)&&Object.defineProperty(o,t,{enumerable:!0,get:r[t]})},o:(e,o)=>Object.prototype.hasOwnProperty.call(e,o)},o={};e.d(o,{a:()=>t,S:()=>a});let r=0;function t(){r++}const a=e=>console.log(e);a(r),t(),t(),t(),a(r),r=0,a(r);var n=o.a,c=o.S;export{n as inc,c as print};
```

# Info

## Unoptimized

```
asset output.js 2.05 KiB [emitted] [javascript module] (name: main)
chunk (runtime: main) output.js (main) 453 bytes (javascript) 396 bytes (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 396 bytes 2 modules
  ./example.js + 2 modules 453 bytes [built] [code generated]
    [exports: inc, print]
    [all exports used]
    entry ./example.js main
    used as library export
webpack 5.20.2 compiled successfully
```

## Production mode

```
asset output.js 314 bytes [emitted] [javascript module] [minimized] (name: main)
chunk (runtime: main) output.js (main) 453 bytes (javascript) 396 bytes (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 396 bytes 2 modules
  ./example.js + 2 modules 453 bytes [built] [code generated]
    [exports: inc, print]
    [all exports used]
    entry ./example.js main
    used as library export
webpack 5.20.2 compiled successfully
```
