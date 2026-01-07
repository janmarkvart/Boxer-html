//--------------------------------------------------------------------------------
    // Generic tokenizer: splits raw data into individual operations
    // (=> also trims whitespace characters used for editing stability)
//--------------------------------------------------------------------------------

import * as TG_api from "./TurtleGraphics.js";
import * as IO_api from "./IO.js";
import * as CF_api from "./ControlFlow.js";

function BoxerTokenizer(caller_box)
{
    let tokens = [];
    let current_token = [];

    let box_code;
    if(caller_box.nodeName == "DOIT-BOX" || caller_box.nodeName == "DATA-BOX")
    {
        box_code = caller_box.getElementsByTagName('BOX-CODE')[0].childNodes;
    }
    else
    {
        box_code = caller_box.childNodes;
    }

    for(let i = 0; i < box_code.length; i++)
    {
        let child = box_code[i];
        if(child.nodeType == Node.TEXT_NODE)
        {
            let trimmed = child.data.trim();
            if(trimmed == "") {continue;}
            let words = trimmed.split(/\s+/);//split by whitespace
            for(let j = 0; j < words.length; j++)
            {
                current_token.push(words[j]);
            }
        }
        if(child.nodeType == Node.ELEMENT_NODE)
        {
            if(child.nodeName == "BR" && current_token.length != 0)
            {
                //<BR> works as a universal separator between operations
                tokens.push(current_token);
                current_token = [];
            }
            if(child.nodeName == "BOX-CODE")
            {
                current_token.push(child);
            }
            if(child.nodeName == "DOIT-BOX")
            {
                current_token.push(child);
            }
            if(child.nodeName == "DATA-BOX")
            {
                current_token.push(child);
            }
        }
    }
    if(current_token.length > 0) { tokens.push(current_token); }

    return tokens;
}

//--------------------------------------------------------------------------------
    // Generic token sorter: sorts (parsed)tokens by priority 
    // (variables > nested_doits > operations)
//--------------------------------------------------------------------------------

function BoxerTokenSorter(tokens)
{
    let operations = [];
    let variables = [];
    let nested_doits = [];
    let parsers = BoxerOperationParser.derived_parsers;
    tokens.forEach(token => {
        //calls individual operation Parsers, depending on which one succeeds->sorts into categories
        //new_var has absolute ordering priority to ensure variables are ready for use in other operations,
        //followed by nested_doit boxes, followed by primitive operations
        parsers.forEach(parser => {
            let res = parser.prototype.parse(token);
            if(res === null) { console.log("nope"); return; }
            switch (res.operation) {
                case "new_var":
                    variables.push(res);
                    break;
                case "nested_doit":
                    nested_doits.push(res);
                    break;
                default:
                    operations.push(res);
                    break;
            }
        });
    });

    let sorted_tokens = variables.concat(nested_doits, operations);
    return sorted_tokens;
}

//--------------------------------------------------------------------------------
    // Parsers for individual operations
//--------------------------------------------------------------------------------

class BoxerOperationParser 
{
    static derived_parsers = new Set();
    parse(token) {}
}

//----------------------------------------------
    // Parsers for IO operations
//----------------------------------------------

class BoxerNewVarParser extends BoxerOperationParser 
{

    static new_parser = BoxerOperationParser.derived_parsers.add(this);
    parse(token) 
    {
        //checks if name is matching this parser + argcount > 1 
        // (additional args ignored)
        if(token.length > 1 && token[0] instanceof HTMLElement && token[0].nodeName === "DATA-BOX") 
        {
            return {
                operation: "new_var",
                operands: [token[1]]
            }
        }
        return null;
    }
}

class BoxerNestedDoitParser extends BoxerOperationParser 
{

    static new_parser = BoxerOperationParser.derived_parsers.add(this);
    parse(token) 
    {
        //checks if name is matching this parser + argcount > 1 
        // (additional args ignored)
        if(token.length > 1 && token[0] instanceof HTMLElement && token[0].nodeName === "DOIT-BOX") 
        {
            return {
                operation: "nested_doit",
                operands: [token[1]]
            }
        }
        return null;
    }
}

class BoxerLogParser extends BoxerOperationParser 
{
    static new_parser = BoxerOperationParser.derived_parsers.add(this);
    parse(token) 
    {
        //checks if name is matching this parser + argcount > 1 
        // (additional args ignored)
        if(token.length > 1 && typeof(token[0]) === "string" && token[0] === "log") 
        {
            return {
                operation: "log",
                operands: [token[1]]
            }
        }
        return null;
    }
}

//----------------------------------------------
    // Parsers for Turtle graphics operations
//----------------------------------------------

class BoxerForwardParser extends BoxerOperationParser 
{
    static new_parser = BoxerOperationParser.derived_parsers.add(this);
    parse(token) 
    {
        //checks if name is matching this parser + argcount > 1 
        // (additional args ignored)
        if(token.length > 1 && typeof(token[0]) === "string" && token[0] === "forward") 
        {
            return {
                operation: "forward",
                operands: [token[1]]
            }
        }
        return null;
    }    
}

class BoxerSkipParser extends BoxerOperationParser 
{
    static new_parser = BoxerOperationParser.derived_parsers.add(this);
    parse(token) 
    {
        //checks if name is matching this parser + argcount > 1 
        // (additional args ignored)
        if(token.length > 1 && typeof(token[0]) === "string" && token[0] === "skip") 
        {
            return {
                operation: "skip",
                operands: [token[1]]
            }
        }
        return null;
    }    
}

class BoxerLeftParser extends BoxerOperationParser 
{
    static new_parser = BoxerOperationParser.derived_parsers.add(this);
    parse(token) 
    {
        //checks if name is matching this parser + argcount > 1 
        // (additional args ignored)
        if(token.length > 1 && typeof(token[0]) === "string" && token[0] === "left") 
        {
            return {
                operation: "left",
                operands: [token[1]]
            }
        }
        return null;
    }    
}

class BoxerRightParser extends BoxerOperationParser 
{
    static new_parser = BoxerOperationParser.derived_parsers.add(this);
    parse(token) 
    {
        //checks if name is matching this parser + argcount > 1 
        // (additional args ignored)
        if(token.length > 1 && typeof(token[0]) === "string" && token[0] === "right") 
        {
            return {
                operation: "right",
                operands: [token[1]]
            }
        }
        return null;
    }    
}

//----------------------------------------------
    // Parsers for Control flow operations
//----------------------------------------------

class BoxerRepeatParser extends BoxerOperationParser 
{
    static new_parser = BoxerOperationParser.derived_parsers.add(this);
    parse(token) 
    {
        //checks if argcount > 2 (this is ok to do here)
        // & first is a number (this is not something we can check here!(can be variable name) do it in execution instead)
        // & second is a box-code/doit-box(->grab its box-code) (this is not something we can check here!(can be variable name) do it in execution instead)
        // (additional args ignored)
        return null;
    }    
}

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

    constructor(ops, vars = null) 
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
                    op.operands.unshift(variables);
                }
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
    let tokens = BoxerTokenizer(caller_box);
    console.log(tokens);
    let sorted_tokens = BoxerTokenSorter(tokens);
    console.log(sorted_tokens);
    let executor = new BoxerExecutor(sorted_tokens, variables);
    executor.Execute();
}

export default BoxerEvaluator

//TODO: parsing and sorting phase should sort out:
//1) explicit comments (databox with name #) (also not implemented yet!)
//2) user-attemps to invoke 'new_var' (should be treated as a non-operation and filtered out from evaluated code)
//      - no other explicit "bans" should exist ('clear' will be replaced with nestingCounter)