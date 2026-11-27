const foo = 42, bar = 42;
export { foo as "\ud800\udbff" } // should throw
export { bar as "\udbff\udfff" } // should not throw
