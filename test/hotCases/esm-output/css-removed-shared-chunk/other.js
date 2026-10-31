window.otherShared = import(/* webpackChunkName: "shared" */ "./shared.css");
window.otherHot = module.hot;
module.hot.accept();
---
window.otherShared = import(/* webpackChunkName: "shared" */ "./shared.css");
window.otherHot = module.hot;
module.hot.accept();
---
window.otherHot = module.hot;
module.hot.accept();
