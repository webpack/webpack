export const value = 1;
export const load = () => import("./chunk");
---
export const value = 1;
export const load = () => Promise.resolve();
---
export const value = 2;
export const load = () => Promise.resolve();
