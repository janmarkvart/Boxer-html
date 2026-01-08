export function parseBox(caller_box)
{
    //translates the provided box element into individual operations & their operands to be evaluated,
    // separated into variables, nested code, and operations
    let operations = [];
    let variables = [];
    let nested_doits = [];
    let current_operation = {
        operation: null,
        operands: []
    };
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
            let trimmed = child.data.replace(/\u200B/g,'').trim();
            if(trimmed == "") {continue;}
            let words = trimmed.split(/\s+/);//split by whitespace
            let idx = 0;
            if(current_operation.operation == null)
            {
                //input operation can only be first, otherwise we ignore it entirely
                if(words[idx] == "input" && i != 0){continue;}
                current_operation.operation = words[idx];
                idx++;
            }
            for(let j = idx; j < words.length; j++)
            {
                current_operation.operands.push(words[j]);
            }
        }
        if(child.nodeType == Node.ELEMENT_NODE)
        {
            if(child.nodeName == "BR" && current_operation.operation != null)
            {
                //<BR> works as a universal separator between operations
                operations.push(current_operation);
                current_operation = {
                    operation: null,
                    operands: []
                };
            }
            if(child.nodeName == "BOX-CODE")
            {
                if(current_operation.operation != null) {
                    //is part of repeat
                    current_operation.operands.push(child);
                }
                else
                {
                    current_operation = {
                        operation: "nested_code",
                        operands: [child]
                    };
                }
            }
            if(child.nodeName == "DOIT-BOX")
            {
                if(current_operation.operation != null) {
                    //is part of repeat
                    current_operation.operands.push(child);
                }
                //also add is as a "variable"
                let doitbox_id = child.id;
                let doitbox_content = child.getElementsByTagName('BOX-CODE')[0];
                nested_doits.push({
                    operation: "nested_doit",
                    operands: [doitbox_id, doitbox_content]
                });
            }
            if(child.nodeName == "DATA-BOX")
            {
                //try to create new variable
                let databox_content = child.getElementsByTagName('BOX-CODE')[0].childNodes;
                if(databox_content.length == 1 && databox_content[0].nodeType == Node.TEXT_NODE)
                {
                    //simple databox variable
                    let possible_var = databox_content[0].wholeText;
                    //if operation exists, add it as an operand
                    if(current_operation.operation != null)
                    {
                        current_operation.operands.push(possible_var);
                        operations.push(current_operation);
                        current_operation = {
                            operation: null,
                            operands: []
                        };
                    }
                    //and add new op to create variable in eval box
                    variables.push({
                        operation: "new_var",
                        operands: [child.getElementsByTagName("BOX-NAME")[0].innerText, possible_var]
                    });
                }
                else
                {
                    //complex databox variable
                    let complex_variable = parseBox(child);
                    if(current_operation.operation != null)
                    {
                        operations.push(current_operation);
                        current_operation = {
                            operation: null,
                            operands: []
                        };
                    }
                    //and add new op to create variable in eval box
                    variables.push({
                        operation: "new_var",
                        operands: [child.getElementsByTagName("BOX-NAME")[0].innerText, complex_variable]
                    });
                }
            }
        }
    };
    if(current_operation.operation != null)
    {
        operations.push(current_operation);
    }
    //add a clear operation to clear variables created in this scope
    operations.push({
        operation: "clear",
        operands: [variables.length + nested_doits.length]
    });
    //merge all three types together in a way that all variables are prepared first, then boxes, then other operations
    //this ensures all variables and doit-boxes are ready for potential use in operations, 
    // eliminating the need for a more complex evaluation down the line
    let all_operations = variables.concat(nested_doits, operations);
    return all_operations;
}

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
                if(current_token.length != 0) {
                    //is part of repeat
                    current_token.push(child);
                }
                //also add is as a "variable"
                tokens.push([child]);
            }
            if(child.nodeName == "DATA-BOX")
            {
                if(current_token.length != 0) {
                    //is part of another operation
                    current_token.push(child);
                }
                //also add is as a "variable"
                tokens.push([child]);
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
        //checks if 0th argument is a data-box
        // (additional args ignored)
        if(token.length)
        if(token.length > 0 && token[0] instanceof HTMLElement && token[0].nodeName === "DATA-BOX") 
        {
            //try to create new variable
            let databox = token[0];
            let databox_id = databox.id;
            let databox_content = databox.getElementsByTagName('BOX-CODE')[0].childNodes;
            if(databox_content.length == 1 && databox_content[0].nodeType == Node.TEXT_NODE)
            {
                //simple databox variable
                let possible_var = databox_content[0].wholeText;
                return {
                    operation: "new_var",
                    operands: [databox_id, possible_var]
                }
            }
            else
            {
                //complex databox variable
                let complex_variable = BoxerParser(databox);
                console.log(complex_variable);
                return {
                    operation: "new_var",
                    operands: [databox_id, complex_variable]
                }
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
        //checks if 0th argument is a data-box
        // (additional args ignored)
        if(token.length > 0 && token[0] instanceof HTMLElement && token[0].nodeName === "DOIT-BOX") 
        {
            let doitbox = token[0];
            let doitbox_id = doitbox.id;
            let doitbox_content = doitbox.getElementsByTagName('BOX-CODE')[0];
            return {
                operation: "nested_doit",
                operands: [doitbox_id,doitbox_content]
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
        //checks if name is recognized by this parser + argcount > 1 
        // (only needs 1, additional args ignored)
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

class BoxerInputParser extends BoxerOperationParser 
{
    //TODO: needs to only trigger if its the first ever operation in a box somehow
    static new_parser = BoxerOperationParser.derived_parsers.add(this);
    parse(token) 
    {
        //checks if name is recognized by this parser + argcount > 1 
        // (can theoretically be as many as we want)
        if(token.length > 1 && typeof(token[0]) === "string" && token[0] === "input") 
        {
            return {
                operation: "input",
                operands: [token.slice(1)]
            }
        }
        return null;
    }
}

class BoxerChangeParser extends BoxerOperationParser 
{
    static new_parser = BoxerOperationParser.derived_parsers.add(this);
    parse(token) 
    {
        //checks if name is recognized by this parser + argcount > 2 
        // (only needs 2, additional args ignored)
        if(token.length > 2 && typeof(token[0]) === "string" && token[0] === "change") 
        {
            return {
                operation: "change",
                operands: [token[1],token[2]]
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
        //checks if name is recognized by this parser + argcount > 1 
        // (only needs 1, additional args ignored)
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
        //checks if name is recognized by this parser + argcount > 1 
        // (only needs 1, additional args ignored)
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
        //checks if name is recognized by this parser + argcount > 1 
        // (only needs 1, additional args ignored)
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
        //checks if name is recognized by this parser + argcount > 1 
        // (only needs 1, additional args ignored)
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
        //checks if name is recognized by this parser + argcount > > 2
        // (only needs two, additional args ignored)
        if(token.length > 2 && typeof(token[0]) === "string" && token[0] === "repeat") 
        {
            return {
                operation: "repeat",
                operands: [token[1],token[2]]
            }
        }
        return null;
    }    
}

class BoxerForParser extends BoxerOperationParser 
{
    static new_parser = BoxerOperationParser.derived_parsers.add(this);
    parse(token) 
    {
        //checks if name is recognized by this parser + argcount > > 4
        // (only needs two, additional args ignored)
        if(token.length > 2 && typeof(token[0]) === "string" && token[0] === "for" 
            && typeof(token[2]) === "string" && token[2] === "in") 
        {
            return {
                operation: "for",
                operands: [token[1],token[2],token[3],token[4]]
            }
        }
        return null;
    }    
}

class BoxerIfParser extends BoxerOperationParser 
{
    static new_parser = BoxerOperationParser.derived_parsers.add(this);
    parse(token) 
    {
        //checks if name is recognized by this parser + argcount > > 4
        // (only needs two, additional args ignored)
        if(token.length > 4 && typeof(token[0]) === "string" && token[0] === "if") 
        {
            return {
                operation: "if",
                operands: [token[1],token[2],token[3],token[4]]
            }
        }
        return null;
    }    
}

//--------------------------------------------------------------------------------
    // Parsers export function
//--------------------------------------------------------------------------------

export function BoxerParser(caller_box)
{
    console.log("new parser");
    let tokens = BoxerTokenizer(caller_box);
    console.log(tokens);
    let sorted_tokens = BoxerTokenSorter(tokens);
    return sorted_tokens;
}

//export default parseBox;