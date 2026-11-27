class MyClass extends BaseClass {
  override show() {}
  public override show() {}
  override size = 5;
  override readonly size = 5;

  override get text() {}
  override set text(value) {}

  override async fetch() {}

  override [x] = 2
  override [x]() {}
}

declare class DeclaredClass extends BaseClass {
  override test()
}
