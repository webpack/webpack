exports.load = () => import(/* webpackChunkName: "worker-css" */ "./worker.css");
// Never started: the worker only keeps the stylesheet's chunk in the build.
exports.start = () => new Worker(new URL("./worker.js", import.meta.url));
module.hot.accept();
---
exports.load = () => Promise.resolve();
exports.start = () => new Worker(new URL("./worker.js", import.meta.url));
module.hot.accept();
