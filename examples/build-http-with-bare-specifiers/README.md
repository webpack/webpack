# example.js

```javascript
import pMap1 from "https://cdn.skypack.dev/p-map";
import pMap2 from "https://cdn.esm.sh/p-map";
import pMap3 from "https://jspm.dev/p-map";
console.log(pMap1);
console.log(pMap2);
console.log(pMap3);
```

# webpack.config.js

```javascript
module.exports = {
	// enable verbose logging to see network requests
	// stats: {
	// 	logging: "verbose"
	// },
	experiments: {
		buildHttp: true
	}
};
```

# Info

## Unoptimized

```
asset output.js 58.1 KiB [emitted] (name: main)
runtime modules 670 bytes 3 modules
modules by path https:// 20.9 KiB
  modules by path https://jspm.dev/ 8.43 KiB
    modules by path https://jspm.dev/*.0 6.04 KiB 5 modules
    modules by path https://jspm.dev/npm:@jspm/ 1.99 KiB 2 modules
  modules by path https://cdn.esm.sh/ 5.72 KiB 7 modules
  modules by path https://cdn.skypack.dev/ 6.72 KiB
    https://cdn.skypack.dev/p-map 2.29 KiB [built] [code generated]
      [exports: default, pMapSkip]
      [used exports unknown]
      harmony side effect evaluation https://cdn.skypack.dev/p-map ./example.js 1:0-50
      harmony import specifier https://cdn.skypack.dev/p-map ./example.js 4:12-17
    https://cdn.skypack.dev/-/aggregate-error@v4.0.0-rCH8s5R9g4kQQ807o58j/dist=es2020,mode=imports/optimized/aggregate-error.js 1.99 KiB [built] [code generated]
      [exports: default]
      [used exports unknown]
      harmony side effect evaluation /-/aggregate-error@v4.0.0-rCH8s5R9g4kQQ807o58j/dist=es2020,mode=imports/optimized/aggregate-error.js https://cdn.skypack.dev/p-map 1:0-130
      harmony import specifier /-/aggregate-error@v4.0.0-rCH8s5R9g4kQQ807o58j/dist=es2020,mode=imports/optimized/aggregate-error.js https://cdn.skypack.dev/p-map 32:23-37
    https://cdn.skypack.dev/-/indent-string@v5.0.0-VgKPSgi4hUX5NbF4n3aC/dist=es2020,mode=imports/optimized/indent-string.js 827 bytes [built] [code generated]
      [exports: default]
      [used exports unknown]
      harmony side effect evaluation /-/indent-string@v5.0.0-VgKPSgi4hUX5NbF4n3aC/dist=es2020,mode=imports/optimized/indent-string.js https://cdn.skypack.dev/-/aggregate-error@v4.0.0-rCH8s5R9g4kQQ807o58j/dist=es2020,mode=imports/optimized/aggregate-error.js 23:0-124
      harmony import specifier /-/indent-string@v5.0.0-VgKPSgi4hUX5NbF4n3aC/dist=es2020,mode=imports/optimized/indent-string.js https://cdn.skypack.dev/-/aggregate-error@v4.0.0-rCH8s5R9g4kQQ807o58j/dist=es2020,mode=imports/optimized/aggregate-error.js 45:21-33
    https://cdn.skypack.dev/-/clean-stack@v4.1.0-DgWUKXHVzThBBZtsHXhC/dist=es2020,mode=imports/optimized/clean-stack.js 1.4 KiB [built] [code generated]
      [exports: default]
      [used exports unknown]
      harmony side effect evaluation /-/clean-stack@v4.1.0-DgWUKXHVzThBBZtsHXhC/dist=es2020,mode=imports/optimized/clean-stack.js https://cdn.skypack.dev/-/aggregate-error@v4.0.0-rCH8s5R9g4kQQ807o58j/dist=es2020,mode=imports/optimized/aggregate-error.js 24:0-118
      harmony import specifier /-/clean-stack@v4.1.0-DgWUKXHVzThBBZtsHXhC/dist=es2020,mode=imports/optimized/clean-stack.js https://cdn.skypack.dev/-/aggregate-error@v4.0.0-rCH8s5R9g4kQQ807o58j/dist=es2020,mode=imports/optimized/aggregate-error.js 43:66-76
    https://cdn.skypack.dev/-/escape-string-regexp@v5.0.0-SUDdAhYOdAgXIYndxZss/dist=es2020,mode=imports/optimized/escape-string-regexp.js 240 bytes [built] [code generated]
      [exports: default]
      [used exports unknown]
      harmony side effect evaluation /-/escape-string-regexp@v5.0.0-SUDdAhYOdAgXIYndxZss/dist=es2020,mode=imports/optimized/escape-string-regexp.js https://cdn.skypack.dev/-/clean-stack@v4.1.0-DgWUKXHVzThBBZtsHXhC/dist=es2020,mode=imports/optimized/clean-stack.js 1:0-144
      harmony import specifier /-/escape-string-regexp@v5.0.0-SUDdAhYOdAgXIYndxZss/dist=es2020,mode=imports/optimized/escape-string-regexp.js https://cdn.skypack.dev/-/clean-stack@v4.1.0-DgWUKXHVzThBBZtsHXhC/dist=es2020,mode=imports/optimized/clean-stack.js 7:60-78
./example.js 201 bytes [built] [code generated]
  [no exports]
  [used exports unknown]
  entry ./example.js main
webpack 5.48.0 compiled successfully
```

## Production mode

```
asset output.js 11.3 KiB [emitted] [minimized] (name: main)
orphan modules 20.9 KiB [orphan] 23 modules
./example.js + 22 modules 21 KiB [built] [code generated]
  [no exports]
  [no exports used]
  entry ./example.js main
webpack 5.48.0 compiled successfully
```
