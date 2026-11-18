(function (globalThis) { globalThis.Math.abs = function () { return 99; }; console.log(Math.abs(-1), globalThis.Math.abs(-1)); })({ Math: {} });
