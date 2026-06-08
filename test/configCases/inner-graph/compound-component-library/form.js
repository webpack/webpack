// Compound component — exported by library entry
import { InternalForm } from "./InternalForm";
import { FormItem } from "./FormItem";
import { FormList } from "./FormList";

const Form = InternalForm;
Form.Item = FormItem;
Form.List = FormList;

export default Form;
