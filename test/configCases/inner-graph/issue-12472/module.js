import { child } from "./child-module1";
import { childFn } from "./child-module2";
import { childFn as childFn2 } from "./child-module3";

const func1 = () => console.log(child);
/*#__PURE__*/func1();
/*@__PURE__*/childFn();
/*#__PURE__*/ childFn2();
