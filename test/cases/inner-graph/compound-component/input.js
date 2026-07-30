// Mirrors antd's components/input/index.tsx compound component pattern
import { InternalInput } from "./InternalInput";
import { Search } from "./Search";
import { Password } from "./Password";
import { TextArea } from "./TextArea";
import { OTP } from "./OTP";
import { Group } from "./Group";
import { bump } from "./sideEffectBump";

const Input = InternalInput;
Input.Search = Search;
Input.Password = Password;
Input.TextArea = TextArea;
Input.OTP = OTP;
Input.Group = Group;
// Impure unused property: must still run while Input is live
Input.setup = bump();

export default Input;
