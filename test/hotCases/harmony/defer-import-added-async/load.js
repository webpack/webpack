export default () => Promise.resolve("initial");
---
export default () => import("./consumer");
