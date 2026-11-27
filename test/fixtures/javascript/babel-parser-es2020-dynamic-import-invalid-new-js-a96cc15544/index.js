new import("foo");

new import("foo").bar;
new import("foo")[bar];
new import("foo")`bar`;
new import("foo").bar(qux);
new import("foo")[bar](qux);
new import("foo")`bar`(qux);
