//control flow operations (if, for, repeat)

//--------------------------------------------------------------------------------
    // Contro Flow Primitive operations
//--------------------------------------------------------------------------------

var control_primitives = {
    "if" : {function: CF_if, needs_variables: false},
    "for" : {function: CF_for, needs_variables: true},
    "repeat" : {function: CF_repeat, needs_variables: false}
}

export function importPrimitives()
{
    return control_primitives;
}

export function CF_if()
{
    let operations = [];

    return operations;
}

export function CF_for()
{
    let operations = [];

    return operations;
}

export function CF_repeat()
{
    let operations = [];

    return operations;
}