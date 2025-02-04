module.exports = 1;
---
new Worker(new URL('./worker.js', import.meta.url))
module.exports = 2;
