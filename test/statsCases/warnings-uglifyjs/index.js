var someRequiredUsedFunction = require("./a");
import {
  ifTrue,
  ifTrueElse,
  ifFalse,
  ifFalseElse,
  ternaryTrueLeft,
  ternaryTrueRight,
  ternaryFalseLeft,
  ternaryFalseRight,
  logicalAndTrue,
  logicalAndFalse,
  logicalOrTrue,
  logicalOrFalse,
} from "./conditional";

function someUsedFunction() {}

someRequiredUsedFunction();
someUsedFunction();

function someUnUsedFunction1() {}
function someUnUsedFunction2() {}
function someUnUsedFunction3() {}
function someUnUsedFunction4() {}
function someUnUsedFunction5() {}

if (true) {
  ifTrue();
}

if (true) {
} else {
  ifTrueElse();
}

if (false) {
  ifFalse();
}

if (false) {
} else {
  ifFalseElse();
}

true ? ternaryTrueLeft() : ternaryTrueRight();
false ? ternaryFalseLeft() : ternaryFalseRight();

true && logicalAndTrue();
false && logicalAndFalse();
true || logicalOrTrue();
false || logicalOrFalse();
