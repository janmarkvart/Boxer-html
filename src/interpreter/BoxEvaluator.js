//--------------------------------------------------------------------------------
    // Generic tokenizer: splits raw data into individual operations
    // (=> also trims whitespace characters used for editing stability)
//--------------------------------------------------------------------------------

import * as TG_api from "./TurtleGraphics.js";
import * as IO_api from "./IO.js";
import * as CF_api from "./ControlFlow.js";
import * as BoxerParser from "./BoxParser.js";

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
        //-||- IO(input,change,log), new_var/nested_doit also IO
        //-||- ControlFlow(if,for,repeat) 
        // - treat all of the as old primitives handling, their specifics handled in files/through return type (see Execute())
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
                console.log(op.operands);
                let res = call.function.apply(call.function, op.operands);
                //TODO: check for return variables or new set of operations to splice
                if(res === undefined) { continue; }
                switch (res.return_type) {
                    case "variables":
                        this.#variables = res.return_value;
                        break;
                    case "operations":
                        this.#operations.splice(processed_op_idx, 0, ...res.return_value);
                        break;
                    default:
                        break;
                }
                continue;
            }
        }
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
    console.log(sorted_tokens);
    let executor = new BoxerExecutor(variables, sorted_tokens);
    executor.Execute();
}

export default BoxerEvaluator

//TODO: parsing and sorting phase should sort out:
//1) explicit comments (databox with name #) (also not implemented yet!)
//2) user-attemps to invoke 'new_var' (should be treated as a non-operation and filtered out from evaluated code)
//      - no other explicit "bans" should exist ('clear' will be replaced with nestingCounter)