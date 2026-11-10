v = a === 1 || a === null || a === void 0;
v = a !== 1 && a !== null && a !== undefined;
v = (b = f()) === null || b === undefined;
v = (b = f()) !== void 0 && b !== null && b !== 1;
v = c === 1 || (b = f()) === null || b === void 0;
v = b === null || (b = f()) === void 0;
v = (b = f()) === null || b === null;
v = !(a === 1 || a === null || a === void 0);
