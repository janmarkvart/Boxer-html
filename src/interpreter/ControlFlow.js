//control flow operations (if, for, repeat)

import * as VAR_api from "./VariableOperations.js";
import * as BoxerParser from "./BoxParser.js";

//--------------------------------------------------------------------------------
    // Contro Flow Primitive operations
//--------------------------------------------------------------------------------

var control_primitives = {
    "if" : {function: CF_if, needs_variables: true},
    "for" : {function: CF_for, needs_variables: true},
    "repeat" : {function: CF_repeat, needs_variables: true}
}

export function importPrimitives()
{
    return control_primitives;
}

export function CF_if(...operands)
{
    let operations = [];

    let res = {
        "return_type": "operations",
        "return_value": operations
    }
    return res;
}

export function CF_for(variables, ...operands)
{
    let operations = [];
    let iter = operands[0];
    let check = operands[1];
    let source = VAR_api.processOperand(variables, operands[2]);
    let box = operands[3];
    if(check == "in")
    {
        console.log(source);
        for(let i = source.length -1 ; i >= 0; i--)
        {
            let elem = source[i];
            console.log(elem);
            if(elem.value !== undefined && elem.value.nodeName != "BOX-CODE")
            {
                variables = {
                    name: iter,
                    value: elem.value,
                    next: variables
                };
                let new_operations = BoxerParser.BoxerParser(box);
                operations = operations.concat(new_operations);
            }
        };
    }
    let res = {
        "return_type": "both",
        "return_variables": variables,
        "return_operations": operations
    }
    return res;
}

export function CF_repeat(variables, times, box)
{
    let operations = [];
    times = Number(VAR_api.processOperand(variables, times));
    if(isNaN(times)) { alert("Repeat: first operand has to be a number!"); return; }
    for(let i = 0; i < times; i++)
    {
        let new_operations = BoxerParser.BoxerParser(box);
        operations = operations.concat(new_operations);
    }
    let res = {
        "return_type": "operations",
        "return_value": operations
    }
    return res;
}