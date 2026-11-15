export class A extends B { constructor() { super(); foo(); this; } }
export class C extends B { constructor() { super(), this.a = 1; this; } }
// Before `super()`, or past one that may not run, `this` throws.
export class D extends B { constructor() { this; super(); } }
export class E extends B { constructor() { if (x) super(); this; } }
