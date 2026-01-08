import * as BoxerParser from "./BoxParser.js";//TODO:temp

function BoxLookup(variables, box_name)
{
    //dynamic:
    let spl = box_name.split('.');
    let curr = variables;
    let dynamic_res = DynamicLookup(curr, spl);
    if(dynamic_res.result != null) { return dynamic_res.result; }

    //box hasn't been found in existing variables, check higher scopes of original caller box
    //since the original caller is saved as the last variable, we can start checking:
    curr = dynamic_res.curr;
    //static:
    let static_res = StaticLookup(curr, spl);
    return static_res;
}

function DynamicLookup(curr, spl)
{
    let spl_idx = 0;
    let found = false;
    while(curr.next != null) 
    {
        if(curr.name == spl[spl_idx])
        {
            //found the box to call
            found = true;
            let box = curr.value;

            spl_idx++;
            while(spl_idx < spl.length)
            {
                found = false;
                if(curr.value.nodeType == Node.ELEMENT_NODE)
                {
                    //is nested doitbox, thus cannot be further processed
                    break;
                }
                curr.value.forEach(item => 
                {
                    if(item.name == spl[spl_idx]) {box = item.value; found = true;}
                });
                spl_idx++;
            }

            if(found)
            {
                return {
                    "result" : box,
                    "curr" : curr //last variable (curr scope) that we use in static if neccessary
                }
            }
        }
        spl_idx = 0;
        curr = curr.next;
    }
    return {
        "result" : null,
        "curr" : curr //last variable (curr scope) that we use in dynamic if neccessary
    }
}

function StaticLookup(curr, spl)
{
    let spl_idx = 0;
    let found = false;
    let curr_scope = curr.value.parentElement;
    while(curr_scope.parentElement != null) 
    {
        if(curr_scope.nodeName == "BOX-CODE" || curr_scope.nodeName == "BODY")
        {
            let candidates = curr_scope.childNodes;
            let desired_box = null;
            candidates.forEach(candidate => 
            {
                if(candidate.nodeName == "DOIT-BOX" && candidate.id == spl[spl_idx])
                {
                    found = true;
                    desired_box = candidate;
                    return desired_box;
                }
                if(candidate.nodeName == "DATA-BOX" && candidate.id == spl[spl_idx])
                {
                    //found the box to call
                    found = true;
                    let parsed = BoxerParser.BoxerParser(candidate);
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
                        processed.value.forEach(item => 
                        {
                            if(item.name == spl[spl_idx]) {processed = item.value; found = true;}
                        });
                        spl_idx++;
                    }

                    if(found)
                    {
                        desired_box = processed;
                        return processed;
                    }
                }
                spl_idx = 0;
            });
            //end search when we found the (nearest) fitting box
            if(found == true) { return desired_box; }
        }
        curr_scope = curr_scope.parentElement;
    }
    return null;
}

export default BoxLookup

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