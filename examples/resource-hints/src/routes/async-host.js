// Entry route: pulls in a mid chunk, which lazy-loads a styled sub-route.
// With `dynamicImportCssPreload`, that sub-route's CSS is preloaded (as=style)
// the moment the mid chunk loads — in parallel with its JavaScript.
import(/* webpackChunkName: "mid" */ "./async-mid.js");

console.log("async host");
