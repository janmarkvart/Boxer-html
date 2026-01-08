//--------------------------------------------------------------------------------
    // Generic tokenizer: splits raw data into individual operations
    // (=> also trims whitespace characters used for editing stability)
//--------------------------------------------------------------------------------

import * as TG_api from "./TurtleGraphics.js";
import * as IO_api from "./IO.js";
import * as CF_api from "./ControlFlow.js";
import * as BoxerParser from "./BoxParser.js";
import * as VAR_api from "./VariableOperations.js";

//--------------------------------------------------------------------------------
    // Parsed operations execution
//--------------------------------------------------------------------------------

class BoxerExecutor
{
    //list of primitives with their corresponding parsers
    #primitives = {};

    // variable TTL: counter that increments on copy&execute call 
    #NestingCounter = 0;

    // decrement event idea:
    // bool "decrementing" for final op of copy&execute-d box

    #variables = null;
    /* Extended variable:
    - name
    - value
    - next
    - *NEW* Context#
    */
    #operations = [];

    constructor(vars = null, ops) 
    {
        this.#operations = ops;
        this.#variables = vars;

        //import all primitives from their respective files:
        let tgop = TG_api.importPrimitives();
        Object.assign(this.#primitives, tgop);
        let iop = IO_api.importPrimitives();
        Object.assign(this.#primitives, iop);
        let cfop = CF_api.importPrimitives();
        Object.assign(this.#primitives, cfop);
    }

    Execute() 
    {
        let processed_op_idx = 0;
        while(processed_op_idx < this.#operations.length)
        {
            let op = this.#operations[processed_op_idx];
            processed_op_idx++;
            let call = this.#primitives[op.operation];
            if(call != null)
            {
                if(call.needs_variables == true)
                {
                    op.operands.unshift(this.#variables);
                }
                let res = call.function.apply(call.function, op.operands);
                if(res !== undefined)
                {
                    switch (res.return_type) {
                    case "variables":
                        this.#variables = res.return_value;
                        break;
                    case "operations":
                        this.#operations.splice(processed_op_idx, 0, ...res.return_value);
                        break;
                    case "both"://"for" primitive returns both the temporal variable and operations
                        this.#variables = res.return_variables;
                        this.#operations.splice(processed_op_idx, 0, ...res.return_operations);
                    default:
                        break;
                    }
                }
                if(Object.hasOwn(op, "returning")) { this.#variables = VAR_api.clearNestingLevelVariables(this.#variables); }
                continue;
            }
        }
        console.log(this.#operations);
        console.log(this.#variables);
        // iterate primitives
        // - if returns new operations[], splice them wherever we are (same splice as before basically)

        //example: repeat
        // "repeat": {function: repeat, argcount: 2, needs_variables: false},
        //      - repeat function imported from COntrolFlow.js
        //      - argcount may be redundant (already checked in parsing), not sure rn check impl
        //      - needs variables same as before
        //      - return type: can return operation[] or nothing (no other cases should exist rn, errors handled in resp. files)
        //          - determine operation[] by checking if first has operation+operands
    }
}

//--------------------------------------------------------------------------------
    // Entrypoint
//--------------------------------------------------------------------------------

function BoxerEvaluator(variables, caller_box)
{
    let sorted_tokens = BoxerParser.BoxerParser(caller_box);
    let executor = new BoxerExecutor(variables, sorted_tokens);
    executor.Execute();
}

export default BoxerEvaluator