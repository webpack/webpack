class C {
  static foo() {}
  static {
    while (this.foo) {
      if (this.foo) {
        break;
      } else {
        continue;
      }
    }
    class C2 {
      bar() {
        return;
      }
    }
  }
}
