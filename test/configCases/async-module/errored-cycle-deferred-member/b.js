import "./a.js";
await Promise.resolve(0);
throw new Error("async error in B");
