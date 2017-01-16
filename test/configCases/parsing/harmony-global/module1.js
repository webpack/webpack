var freeGlobal = typeof global === "object" && global && global.Object === Object && global;

export default freeGlobal;
