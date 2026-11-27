export declare const enum Foo {
    foo = 1,
    bar
}

class AssertsFoo {
  isBar(): asserts this is string {
    return;
  }
  isBaz = (): asserts this is string => {
    return;
  }
}
