//IO operations (input,change,log) + new_var/nested_doit

import * as VAR_api from "./VariableOperations.js";

var IO_primitives = {
    "input": {function: IO_input, needs_variables: true},
    "change": {function: IO_change, needs_variables: true},
    "log": {function: IO_log, needs_variables: true},
    "new_var": {function: IO_new_var, needs_variables: true},
    "nested_doit": {function: IO_nested_doit, needs_variables: true}
}

//--------------------------------------------------------------------------------
    // IO Primitive operations
//--------------------------------------------------------------------------------

export function importPrimitives()
{
    return IO_primitives;
}

export function IO_input(variables,...operands)
{
    //modifies variables
    //TODO: update to VAR_api.updateVariable(...) ?
    operands.forEach(operand => {
        let variables_iter = variables;
        while(variables_iter != null)
        {
            if(variables_iter.name == null)
            {
                //catch it into provided variable name
                variables_iter.name = operand[0];
                break;
            }
            variables_iter = variables_iter.next;
        }
    });
    return variables;
}

export function IO_change(variables, box, update)
{
    let variables_copy = VAR_api.updateVariable(variables, box, update);
    //also update the box itself
    let target_box = document.getElementById(box);
    if(target_box != null)
    {
        if(target_box.nodeName == "DATA-BOX" || target_box.nodeName == "DOIT-BOX")
        {
            let target_box_code = target_box.getElementsByTagName('BOX-CODE')[0];
            target_box_code.innerText = update;
        }
    }
    //modifies variables (&HTML)
    return variables_copy;
}

export function IO_log(variables, word)
{
    word = VAR_api.processOperand(variables, word);
    console.log("printing: " +word);
}

export function IO_new_var(variables, ...addition)
{
    variables = VAR_api.addNewVariable(variables, addition);
    let res = {
        "return_type": "variables",
        "return_value": variables
    }
    return res;
}

export function IO_nested_doit(variables, ...addition)
{
    variables = VAR_api.addNewVariable(variables, addition);
    let res = {
        "return_type": "variables",
        "return_value": variables
    }
    return res;
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
            //recursion for more complex variables
            variable.push({
                name: elem.operands[0],
                value: createComplexVariable(elem.operands[1])
            });
        }
    });
    return variable;
}