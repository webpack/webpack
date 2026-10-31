export default () => Promise.resolve({ default: "none" });
---
export default () => import("./lazy");
---
export default () => import("./lazy");
