# example.js

```javascript
export * from "./counter";
export * from "./methods";
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
/*!********************************!*\
  !*** ./example.js + 2 modules ***!
  \********************************/
/*! namespace exports */
/*! export decrement [provided] [used in main] [missing usage info prevents renaming] -> ./counter.js .decrement */
/*! export increment [provided] [used in main] [missing usage info prevents renaming] -> ./counter.js .increment */
/*! export print [provided] [used in main] [missing usage info prevents renaming] -> ./methods.js .print */
/*! export reset [provided] [used in main] [missing usage info prevents renaming] -> ./counter.js .reset */
/*! export resetCounter [provided] [used in main] [missing usage info prevents renaming] -> ./counter.js .reset */
/*! export value [provided] [used in main] [missing usage info prevents renaming] -> ./counter.js .value */
/*! other exports [not provided] [no usage info] */
/*! runtime requirements:  */

;// ./counter.js
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

;// ./methods.js


const print = value => console.log(value);

;// ./example.js



export { decrement, increment, print, counter_reset as reset, counter_reset as resetCounter, value };
```

# dist/output.js (production)

```javascript
let n=0;function o(){n++}function t(){n--}function e(){n=0}const s=n=>console.log(n);export{t as decrement,o as increment,s as print,e as reset,e as resetCounter,n as value};
```

# Info

## Unoptimized

```
asset output.js 1.19 KiB [emitted] [javascript module] (name: main)
chunk (runtime: main) output.js (main) 302 bytes [entry] [rendered]
  > ./example.js main
  ./example.js + 2 modules 302 bytes [built] [code generated]
    [exports: decrement, increment, print, reset, resetCounter, value]
    [used exports unknown]
    entry ./example.js main
    used as library export
webpack X.X.X compiled successfully
```

## Production mode

```
asset output.js 174 bytes [emitted] [javascript module] [minimized] (name: main)
chunk (runtime: main) output.js (main) 302 bytes [entry] [rendered]
  > ./example.js main
  ./example.js + 2 modules 302 bytes [built] [code generated]
    [exports: decrement, increment, print, reset, resetCounter, value]
    [all exports used]
    entry ./example.js main
    used as library export
webpack X.X.X compiled successfully
```
