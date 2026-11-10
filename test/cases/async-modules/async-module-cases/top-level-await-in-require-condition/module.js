export const value = require((await Promise.resolve(true)) ? "./value" : "./other");
