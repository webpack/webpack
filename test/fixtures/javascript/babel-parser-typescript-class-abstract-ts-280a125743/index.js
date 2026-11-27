abstract class C1 {}
declare abstract class C2 {}
export abstract class C3 {}
// `export abstract class {}` is not valid TypeScript.
export default abstract class { }
export default abstract class C4 { }
// `abstract class` is not valid as an expression.
export default abstract class C5 { abstract foo(): void; }
