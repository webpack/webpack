export abstract class AbstractClass {
    public static myFunc?: <M extends AbstractClass>(
        this: AbstractClass,
        instance: M,
    ) => void;
}

export class ConcreteClass extends AbstractClass {
    declare myField: string;
}

export const init = () => {
    const cls = ConcreteClass;

    cls.myFunc<ConcreteClass> = (instance) => {
        console.log(instance.myField);
    }
}
