exports.load = () => import(/* webpackChunkName: "removed" */ "./style.css");
exports.loadUnused = () => import(/* webpackChunkName: "unused" */ "./unused.css");
exports.loadLate = () => import(/* webpackChunkName: "late" */ "./late.css");
exports.loadShared = () => import(/* webpackChunkName: "shared" */ "./shared.css");
exports.loadPage = () => import(/* webpackChunkName: "page" */ "./page.css");
module.hot.accept();
---
exports.load = () => Promise.resolve();
module.hot.accept();
---
exports.load = () => import(/* webpackChunkName: "removed" */ "./style.css");
exports.loadUnused = () => import(/* webpackChunkName: "unused" */ "./unused.css");
exports.loadLate = () => import(/* webpackChunkName: "late" */ "./late.css");
exports.loadShared = () => import(/* webpackChunkName: "shared" */ "./shared.css");
exports.loadPage = () => import(/* webpackChunkName: "page" */ "./page.css");
module.hot.accept();
