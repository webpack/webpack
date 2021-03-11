export default "module"

export const getValue = () => Promise.resolve({ default: "module" });
---
export { default } from "common"

export const getValue = () => import("common2");
