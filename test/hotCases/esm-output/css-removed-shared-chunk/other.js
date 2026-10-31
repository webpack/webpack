globalThis.otherShared = import(/* webpackChunkName: "shared" */ "./shared.css");
globalThis.otherHot = module.hot;
module.hot.accept();
---
globalThis.otherShared = import(/* webpackChunkName: "shared" */ "./shared.css");
globalThis.otherHot = module.hot;
module.hot.accept();
---
globalThis.otherHot = module.hot;
module.hot.accept();
