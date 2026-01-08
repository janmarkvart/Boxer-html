//--------------------------------------------------------------------------------
    // Evaluating new variables to be added to the list of variables
//--------------------------------------------------------------------------------

export function addNewVariable(variables, addition)
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

export function createComplexVariable(addition)
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

//--------------------------------------------------------------------------------
    // Variable value update - "change" primitive
//--------------------------------------------------------------------------------

export function updateVariable(variables, name, new_value)
{
    let variables_copy = variables;
    while(variables_copy != null)
    {
        if(variables_copy.name == name)
        {
            //found the variable to change
            variables_copy.value = new_value;
            break;
        }
        variables_copy = variables_copy.next;
    }
}

//--------------------------------------------------------------------------------
    // Processing operands - inserting variable values in place of names
//--------------------------------------------------------------------------------

export function processOperands(variables, op)
{
    for(let i = 0; i < op.operands.length; i++)
    {
        op.operands[i] = processOperand(variables, op.operands[i]);
    }
    return op.operands;
}

export function processOperand(variables, operand)
{
    if(typeof operand === 'string')
    {
        let found = false;
        let spl = operand.split('.');
        let spl_idx = 0;
        //is variable to be translated
        let variables_copy = variables;
        while(variables_copy.next != null)
        {
            //first level of lookup
            if(variables_copy.name === spl[spl_idx])
            {
                found = true;
                let variables_nested = variables_copy;
                spl_idx++;
                //looking further into the found value (item.x etc.)
                while(spl_idx < spl.length)
                {
                    found = false;
                    if(variables_nested.value.nodeType == Node.ELEMENT_NODE)
                    {
                        //is nested doitbox, thus cannot be further processed
                        break;
                    }
                    variables_nested.value.forEach(item => 
                    {
                        if(item.name == spl[spl_idx]) {variables_nested = item; found = true;}
                    });
                    spl_idx++;
                }
                if(found) 
                {
                    operand = variables_nested.value;
                    return operand;
                }
            }
            spl_idx = 0;
            variables_copy = variables_copy.next;
        }
        if(found == true) {return operand;}

        //if variable not found, similarly to how called doit boxes are looked up,
        //look into higher scopes of the original caller box to see if the desired variable is defined there
        let curr_scope = variables_copy.value.parentElement;
        found = false;
        while(curr_scope.parentElement != null) 
        {
            if(curr_scope.nodeName == "BOX-CODE" || curr_scope.nodeName == "BODY")
            {
                let candidates = curr_scope.childNodes;
                candidates.forEach(candidate => 
                {
                    //first level of lookup
                    if(candidate.nodeName == "DATA-BOX" && candidate.id == spl[spl_idx])
                    {
                        found = true;
                        //simple variable case: no nested data boxes
                        let candidate_content = candidate.getElementsByTagName("BOX-CODE")[0];
                        if(candidate_content.getElementsByTagName("DOIT-BOX").length == 0 &&
                            candidate_content.getElementsByTagName("DATA-BOX").length == 0 && spl.length == 1)
                        {
                            operand = candidate_content.innerText.trim();
                            return operand;
                        }
                        let parsed = parseBox.parseBox(candidate);
                        let processed = addNewVariable(null, [candidate.id, parsed]);

                        spl_idx++;
                        while(spl_idx < spl.length)
                        {
                            found = false;
                            if(processed.value.nodeType == Node.ELEMENT_NODE)
                            {
                                //is nested doitbox, thus cannot be further processed
                                break;
                            }
                            processed.value.forEach(item => {
                                if(item.name == spl[spl_idx]) {processed = item; found = true;}
                            });
                            spl_idx++;
                        }
                        if(found) 
                        {
                            //end search when we found the (nearest) fitting box
                            operand = processed.value;
                            return operand;
                        }
                    }
                    spl_idx = 0;
                });
            }
            curr_scope = curr_scope.parentElement;
        }
    }
    return operand;
}

//--------------------------------------------------------------------------------
    // Creating empty(unnamed) variables for the "input" primitive
//--------------------------------------------------------------------------------

export function createEmptyVariables(variables, op)
{
    //creates empty variables (without a name), that will then be caught and "completed" by the input operation
    let new_var = variables;
    for(let i = op.operands.length -1 ; i >= 1; i--)
    {
        let curr_operand = op.operands[i];
        curr_operand = processOperand(variables, curr_operand);
        let tmp = new_var;
        new_var = {
            name: null,
            value: curr_operand,
            next: tmp
        };
    }
    return new_var;
}