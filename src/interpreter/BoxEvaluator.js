//--------------------------------------------------------------------------------
    // Generic tokenizer: splits raw data into individual operations
    // (=> also removes whitespace characters used for editing stability)
//--------------------------------------------------------------------------------

function BoxerTokenizer(caller_box)
{
    let tokens = [];

    //...

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
    tokens.forEach(token => {
        //calls individual operation Parsers, depending on which one succeeds->sorts into categories
        //could we treat new_var/nested_doit as special cases or include them in generic operation parsers?
        //->NO, just as any other parser
    });

    let sorted_tokens = variables.concat(nested_doits, operations);
    return sorted_operations;
}

//--------------------------------------------------------------------------------
    // Parsers for individual operations
//--------------------------------------------------------------------------------

class BoxerOperationParser 
{
    static derived_parsers = new Set();
    parse() {}
}

//new parser created afterwars here will not break anything -> priority of var>doit>ops is handled in BoxerTokenSorter

//new_var

class BoxerForwardParser extends BoxerOperationParser 
{

    static new_parser = BoxerOperationParser.derived_parsers.add(this);
    parse() 
    {
        //checks if argcount > 1 (this is ok to do here)
        // & first is a number (this is not something we can check here!(can be variable name) do it in execution instead)
        // (additional args ignored)
    }
}

class BoxerRepeatParser extends BoxerOperationParser 
{
    static new_parser = BoxerOperationParser.derived_parsers.add(this);
    parse() 
    {
        //checks if argcount > 2 (this is ok to do here)
        // & first is a number (this is not something we can check here!(can be variable name) do it in execution instead)
        // & second is a box-code/doit-box(->grab its box-code) (this is not something we can check here!(can be variable name) do it in execution instead)
        // (additional args ignored)
    }    
}



//--------------------------------------------------------------------------------
    // Parsed operations execution
//--------------------------------------------------------------------------------

class BoxerExecutor
{
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
    #operations;

    BoxerExecutor(ops, vars = null) 
    {
        //constructor
        this.#operations = ops;
        this.#variables = vars;
    }

    Execute() 
    {
        // iterate operations + extend it same as before
    }
}

//--------------------------------------------------------------------------------
    // Entrypoint
//--------------------------------------------------------------------------------

function BoxerEvaluator(variables, caller_box)
{
    let res = BoxerParser(caller_box);
    let sorted_res = BoxerTokenSorter(res);
    let executor = BoxerExecutor(sorted_res, variables);
    executor.Execute();
}

export default BoxerEvaluator

//TODO: parsing and sorting phase should sort out:
//1) explicit comments (databox with name #) (also not implemented yet!)
//2) user-attemps to invoke 'new_var' (should be treated as a non-operation and filtered out from evaluated code)
//      - no other explicit "bans" should exist ('clear' will be replaced with nestingCounter)