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
/*!********************************!*\
  !*** ./example.js + 2 modules ***!
  \********************************/
/*! namespace exports */
/*! runtime requirements:  */

// CONCATENATED MODULE: ./counter.js
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

// CONCATENATED MODULE: ./methods.js


const print = value => console.log(value);

// CONCATENATED MODULE: ./example.js


print(value);
increment();
increment();
increment();
print(value);
counter_reset();
print(value);
```

# dist/output.js (production)

```javascript
let o=0;function n(){o++}const c=o=>console.log(o);c(o),n(),n(),n(),c(o),o=0,c(o);
```

# Info

## Unoptimized

```
asset output.js 577 bytes [emitted] (name: main)
chunk (runtime: main) output.js (main) 429 bytes [entry] [rendered]
  > ./example.js main
  ./example.js + 2 modules 429 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
webpack 5.0.0-rc.2 compiled successfully
```

## Production mode

```
asset output.js 82 bytes [emitted] [minimized] (name: main)
chunk (runtime: main) output.js (main) 429 bytes [entry] [rendered]
  > ./example.js main
  ./example.js + 2 modules 429 bytes [built] [code generated]
    [no exports]
    [no exports used]
    entry ./example.js main
webpack 5.0.0-rc.2 compiled successfully
```
