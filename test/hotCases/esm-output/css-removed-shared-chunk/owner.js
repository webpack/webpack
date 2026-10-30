exports.load = () => import(/* webpackChunkName: "shared" */ "./shared.css");
module.hot.accept();
---
exports.load = () => Promise.resolve();
module.hot.accept();
