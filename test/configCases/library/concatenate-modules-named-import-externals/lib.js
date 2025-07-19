import { HomeLayout as aaa } from 'externals0';

const { HomeLayout = 123 } = {};
console.log({ HomeLayout });
{
    const { HomeLayout = aaa } = {};
    console.log({ HomeLayout });
}
(() => {
    {
        const { HomeLayout = aaa } = {};
        console.log({ HomeLayout });
    }
})()

{
    const { external_externals3_namespaceObject = "111" } = {}
            console.log({ external_externals3_namespaceObject });
}

export { HomeLayout }