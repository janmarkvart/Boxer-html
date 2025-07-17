function parseBox(caller_box)
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
            let trimmed = child.data.trim();
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

export default parseBox;