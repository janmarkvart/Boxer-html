//IO operations (input,change,log) + new_var/nested_doit

var IO_primitives = {
    "input": {function: IO_input, needs_variables: true},
    "change": {function: IO_change, needs_variables: true},
    "log": {function: IO_log, needs_variables: false},
    "new_var": {function: IO_nested_doit, needs_variables: true},
    "nested_doit": {function: IO_new_var, needs_variables: true}
}

//--------------------------------------------------------------------------------
    // IO Primitive operations
//--------------------------------------------------------------------------------

export function importPrimitives()
{
    return IO_primitives;
}

export function IO_input(variables/*,...*/)
{
    //modifies variables
    //TODO: lookup how to do dynamic amount of function arguments (should be sth like ...inputs)
    return variables;
}

export function IO_change(variables/*,...*/)
{
    //modifies variables (&HTML)
    return variables;
}

export function IO_log(word)
{
    console.log("printing: " +word);
}

export function IO_new_var(variables/*,...*/)
{
    //modifies variables
    return variables;
}

export function IO_nested_doit(variables/*,...*/)
{
    //modifies variables
    return variables;
}

//--------------------------------------------------------------------------------
    // Evaluating new variables to be added to the list of variables
//--------------------------------------------------------------------------------

function addNewVariable(variables, addition)
{
    let tmp = variables;
    if(addition[1].constructor != Array)
    {
        //simple variable
        let new_var = {
            name: addition[0],
            value: addition[1],
            next: tmp
        }
        variables = new_var;
    }
    else 
    {
        //complex variable
        let new_var = {
            name: addition[0],
            value: createComplexVariable(addition[1]),
            next: tmp
        }
        variables = new_var;
    }
    return variables;
}

function createComplexVariable(addition)
{
    let variable = [];
    addition.forEach(elem => 
    {
        if(elem.operation == "clear" || elem.operands.length == 1) {return;} //filter non-variables
        if(elem.operands[1].constructor != Array)
        {
            variable.push({
                name: elem.operands[0],
                value: elem.operands[1]
            });
        }
        else 
        {
            //even more complex variable!
            variable.push({
                name: elem.operands[0],
                value: createComplexVariable(elem.operands[1])
            });
        }
    });
    return variable;
}