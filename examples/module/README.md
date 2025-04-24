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
/*!********************************!*\
  !*** ./example.js + 2 modules ***!
  \********************************/
/*! namespace exports */
/*! export inc [provided] [used in main] [could be renamed] -> ./counter.js .increment */
/*! export print [provided] [used in main] [could be renamed] -> ./methods.js .print */
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


print(value);
increment();
increment();
increment();
print(value);
counter_reset();
print(value);



export { increment as inc, print };
```

# dist/output.js (production)

```javascript
let o=0;function n(){o++}const c=o=>console.log(o);c(o),n(),n(),n(),c(o),o=0,c(o);export{n as inc,c as print};
```

# Info

## Unoptimized

```
asset output.js 710 bytes [emitted] [javascript module] (name: main)
chunk (runtime: main) output.js (main) 453 bytes [entry] [rendered]
  > ./example.js main
  ./example.js + 2 modules 453 bytes [built] [code generated]
    [exports: inc, print]
    [all exports used]
    entry ./example.js main
    used as library export
webpack 5.99.6 compiled successfully
```

## Production mode

```
asset output.js 110 bytes [emitted] [javascript module] [minimized] (name: main)
chunk (runtime: main) output.js (main) 453 bytes [entry] [rendered]
  > ./example.js main
  ./example.js + 2 modules 453 bytes [built] [code generated]
    [exports: inc, print]
    [all exports used]
    entry ./example.js main
    used as library export
webpack 5.99.6 compiled successfully
```
