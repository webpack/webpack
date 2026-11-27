class A extends B {
  constructor() {
    class C extends D {
      #foo = super();
    }
  }
}