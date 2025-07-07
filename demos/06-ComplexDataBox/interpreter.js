//--------------------------------------------------------------------------------
    // Initial Setup and canvas preparation
//--------------------------------------------------------------------------------

var canvas_pointer = null;
var canvas_context;
var turtle_position = {x: 20, y: 20, rotation: 45};

function canvas_draw(draw_line)
{
    if(canvas_pointer == null)
    {
        alert("Cannot proceed with drawing operation, no canvas present!");
        return;
    }
    if(draw_line)
    {
        canvas_context.lineTo(turtle_position.x, turtle_position.y);
    }
    else
    {
        canvas_context.moveTo(turtle_position.x, turtle_position.y);
    }
    canvas_context.stroke();
}

var primitives = {
    "forward": {function: forward, argcount: 1, needs_variables: false},
    "skip":  {function: skip, argcount: 1, needs_variables: false},
    "rotate":  {function: rotate, argcount: 1, needs_variables: false},
    "log": {function: log, argcount: 1, needs_variables: false}
};

var boxcode_template = 
`
<box-code contenteditable=true>
_
</box-code>
<br>
`;

var doitbox_template = 
`
<doit-box id="newdoitbox">
<div class="box-header">
<box-name>newdoitbox</box-name>
<div class="header-right">
<button class="boxcode-hide" onclick="boxHeaderShowHide(event)">hide</button>
<button class="doit-execute" onclick="boxHeaderRun(event)">run</button>
<button class="deletebox" onclick="boxHeaderDelete(event)">delete</button>
</div>
</div>
<box-code contenteditable=true>
_
</box-code>
</doit-box>
<br>
`;

var databox_template = 
`
<data-box id="newdatabox">
<div class="box-header">
<box-name>newdatabox</box-name>
<div class="header-right">
<button class="boxcode-hide" onclick="boxHeaderShowHide(event)">hide</button>
<button class="deletebox" onclick="boxHeaderDelete(event)">delete</button>
</div>
</div>
<box-code contenteditable=true>
_
</box-code>
</data-box>
<br>
`

var boxer_templates = {
    "[": {tag_name : "box-code", template: boxcode_template},
    "]": {tag_name : "doit-box", template: doitbox_template},
    "{": {tag_name : "data-box", template: databox_template}
}

window.onload = function() 
{
    //prepare canvas to be callable by boxer functions
    canvas_pointer = document.getElementById('main-canvas');
    if(canvas_pointer != null)
    {
        canvas_context = canvas_pointer.getContext("2d");
        canvas_context.beginPath();
        canvas_context.moveTo(turtle_position.x,turtle_position.y);
    }
    //add execute functionality to doit-boxes
    let doit_runners = document.getElementsByClassName("doit-execute");
    for (let i = 0; i < doit_runners.length; i++) {
        let element = doit_runners[i];
        element.onclick = function(e) {
            boxHeaderRun(e);
        }
    }
    //add show/hide box-code functionality to boxes
    let box_hiders = document.getElementsByClassName("boxcode-hide");
    for (let i = 0; i < box_hiders.length; i++) {
        let element = box_hiders[i];
        element.onclick = function(e) {
            boxHeaderShowHide(e);
        }
    }
    //add ability to delete box
    let box_deletes = document.getElementsByClassName("deletebox");
    for (let i = 0; i < box_deletes.length; i++) {
        let element = box_deletes[i];
        element.onclick = function(e) {
            boxHeaderDelete(e);
        }
    }
}

function boxHeaderRun(e) 
{
    //find the box that was clicked on
    let target = e.target;
    while(target.nodeName != 'DOIT-BOX')
    {
        target = target.parentElement;
    }
    let initial_variable = 
    {
        name: "originalscope",
        value: target,
        next: null
    }
    interpretBox(initial_variable, target);
}
function boxHeaderShowHide(e) 
{
    let target = e.target;
    while(target.nodeName != 'DOIT-BOX' && target.nodeName != 'DATA-BOX')
    {
        target = target.parentElement;
    }
    target_hide_button = target.getElementsByClassName("boxcode-hide")[0];
    target = target.getElementsByTagName('BOX-CODE')[0];
    if (target.style.display === "none") 
    {
        target.style.display = "inline-block";
        target_hide_button.innerText = "hide";
    } 
    else 
    {
        target.style.display = "none";
        target_hide_button.innerText = "show";
    }
}
function boxHeaderDelete(e)
{
    let target = e.target;
    while(target.nodeName != 'DOIT-BOX' && target.nodeName != 'DATA-BOX')
    {
        target = target.parentElement;
    }
    if( confirm("Are you sure you want to delete this box?") == true) { target.remove(); }
}

//--------------------------------------------------------------------------------
    // Event handling for contenteditable elements and template insertion
//--------------------------------------------------------------------------------

window.onclick += function(e) 
{
    let original_target = e.target;
    if(original_target.nodeName != 'BOX-CODE' && original_target.nodeName != 'BOX-NAME'){return;}
    let target = original_target;
    while(target.nodeName != 'DOIT-BOX' && target.nodeName != 'DATA-BOX')
    {
        target = target.parentElement;
    }
    let box_id = target.id;
    let was_user_template = false;
    let previous_key = null;
    if(target.nodeName == 'DATA-BOX')
    {
        let separated_id = box_id.split('_');
        if(separated_id.length === 3 &&  separated_id[0] === "key" && separated_id[1].length === 1 
            && separated_id[2] === "template" && target.nodeName == 'DATA-BOX')
        {
            //data-box was a template when we entered it
            was_user_template = true;
            previous_key = separated_id[1];
        }
    }
    console.log("target box: " + target.id);
    document.activeElement.addEventListener("blur", function onleave(ee)
    {
        document.activeElement.spellcheck = false;
        //check if box is template
        let is_user_template = false;
        let current_key = null;
        let separated_new_id = original_target.innerText.split('_');
        if(separated_new_id.length === 3 &&  separated_new_id[0] === "key" && separated_new_id[1].length === 1 
            && separated_new_id[2] === "template" && target.nodeName == 'DATA-BOX') {is_user_template = true; current_key = separated_new_id[1];}

        if(original_target.nodeName == 'BOX-NAME')
        {
            //box-name serves as box id
            target.id = original_target.innerText;
            if(is_user_template == true)
            {
                //template created/updated
                if(previous_key != null && current_key != previous_key)
                {
                    console.log("removing template "+previous_key+"...");
                    delete boxer_templates[previous_key];
                }
                console.log("creating template "+current_key+"...");
                boxer_templates[current_key] = {tag_name: 'user_'+current_key, template: target.getElementsByTagName('BOX-CODE')[0].innerHTML};
            }
            else if(was_user_template == true)
            {
                //box no longer serves as a template
                console.log("removing template "+previous_key+"...");
                delete boxer_templates[previous_key];
            }
        }
        if(original_target.nodeName == 'BOX-CODE')
        {
            if(was_user_template == true)
            {
                //box is a template
                console.log("updating code of template "+previous_key+"...");
                boxer_templates[previous_key] = {tag_name: 'user_'+current_key, template: original_target.innerHTML};
            }
        }
    },{ once: true });//only triggers once, so no need to remove the listener manually
    if(original_target.nodeName == 'BOX-CODE')
    {
        document.activeElement.onkeyup = function(e)
        {
            //detect whether user pressed a key which corresponds to a box template
            for(let key in boxer_templates)
            {
                if(original_target.innerHTML.indexOf(key) >= 0)
                {
                    insertBox(original_target, key);
                }
            }
        }
    }
}

function insertBox(original_target, key)
{
    console.log(original_target);
    //inserts a new box into the program, based on the key pressed
    let box_template = boxer_templates[key];
    templateInserter(original_target, key, box_template.template);
    
    if(key == "[" || key == "]" || key == "{")
    {
        //one of default templates
        let box_list = original_target.getElementsByTagName(box_template.tag_name);
        let new_box = box_list[box_list.length -1];
        if(box_template.tag_name != "box-code")
        {
            new_box = new_box.getElementsByTagName('box-code')[0];
        }
        let s = window.getSelection();
        let r = document.createRange();
        r.setStart(new_box, 0);
        r.setEnd(new_box, 1);
        s.removeAllRanges();
        s.addRange(r);
    }
}

function templateInserter(current_target, key, template)
{
    //recursively traverses the target element and replaces all text occurences of key with corresponding templates,
    // whilst skipping any box-name elements, preventing self-replacement of templates
    current_target.childNodes.forEach(child => {
        if(child.nodeType == Node.TEXT_NODE)
        {
            if(child.data.indexOf(key) >= 0)
            {
                child.data = child.data.replaceAll(key, "");
                child.after(document.createRange().createContextualFragment(template));
            }
        }
        if(child.nodeName == 'DATA-BOX' || child.nodeName == 'DOIT-BOX')
        {
            templateInserter(child.getElementsByTagName('BOX-CODE')[0], key, template);
        }
    });
}

//--------------------------------------------------------------------------------
    // Process the html syntax into operations to be evaluated
//--------------------------------------------------------------------------------

function interpretBox(variables, caller_box)
{
    console.log("interpreting new box");
    console.log(caller_box);
    let operations = parseBox(caller_box);
    console.log("list of operations to eval");
    console.log(operations);
    evalBox(operations, variables);
}

function parseBox(caller_box) 
{
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
    all_operations = variables.concat(nested_doits, operations);
    return all_operations;
}

//--------------------------------------------------------------------------------
    // Main evaluation function
//--------------------------------------------------------------------------------

function evalBox(operations, variables = null)
{
    let processed_op_idx = 0;
    console.log(operations);
    while(processed_op_idx < operations.length)
    {
        let op = operations[processed_op_idx];
        processed_op_idx++;
        console.log(processed_op_idx);
        console.log("processing operation: ");
        console.log(op);
        console.log("with variables: ");
        console.log(variables);
        if(op.operation == 'input')
        {
            op.operands.forEach(operand => {
                let found = false;
                let variables_iter = variables;
                while(variables_iter != null)
                {
                    if(variables_iter.name == null)
                    {
                        //catch it into provided variable name
                        found = true;
                        variables_iter.name = operand;
                        break;
                    }
                    variables_iter = variables_iter.next;
                }
            });
            continue;
        }
        if(op.operation == 'clear')
        {
            console.log("how many: " + op.operands);
            //clear the variables of latest input
            let variables_copy = variables;
            for(let i = 0; i < op.operands[0]; i++)
            {
                console.log("clearing variable: " + variables_copy.name);
                variables_copy = variables_copy.next;
            }
            variables = variables_copy;
            continue;
        }
        
        //variable creation
        if(op.operation == "new_var" || op.operation == "nested_doit")
        {
            console.log("creating new variable or nested doit box");
            //create new variable (whether data or nested doit)
            variables = addNewVariable(variables, op.operands);
            continue;
        }

        if(op.operation == "nested_code")
        {
            let box = op.operands[0];
            let new_operations = parseBox(box);
            operations.splice(processed_op_idx, 0, ...new_operations);
            continue;
        }
        if(op.operation == "repeat")
        {
            if(op.operands.length < 2) { alert("Repeat operation requires 2 operands, "+op.operands.length+" provided!"); continue; }
            let times = Number(op.operands[0]);
            let box = op.operands[1];
            for(let i = 0; i < times; i++)
            {
                let new_operations = parseBox(box);
                operations.splice(processed_op_idx, 0, ...new_operations);
            }
            continue;
        }

        //operations that require processing only specific operands
        if(op.operation == "for")
        {
            if(op.operands.length < 4) { alert("For operation requires 4 operands, "+op.operands.length+" provided!"); continue; }
            let iter = op.operands[0];
            let check = op.operands[1];
            let source = processOperand(op.operands[2], variables);
            let box = op.operands[3];
            if(check == "in")
            {
                for(let i = source.length -1 ; i >= 0; i--)
                {
                    let elem = source[i];
                    if(elem.value !== undefined)
                    {
                        let new_var = [iter, elem.value];
                        variables = addNewVariable(variables, new_var);
                        let new_operations = parseBox(box);
                        let combined = new_operations.concat([{operation: "clear", operands: [1]}]);
                        operations.splice(processed_op_idx, 0, ...combined);
                    }
                };
            }
            continue;
        }
        if(op.operation == "if")
        {
            if(op.operands.length < 4) { alert("If operation requires 4 operands, "+op.operands.length+" provided!"); continue; }
            let left = processOperand(op.operands[0], variables);
            let comparator = op.operands[1];
            let right = processOperand(op.operands[2], variables);
            let box = op.operands[3];
            try
            {
                if(eval("\""+left +"\""+ comparator +"\""+ right +"\" ? true : false"))
                {
                    let new_operations = parseBox(box);
                    operations.splice(processed_op_idx, 0, ...new_operations);
                }
            }
            catch(e)
            {
                if(e instanceof SyntaxError) { alert("if: provided condition contains syntax errors!");}
            }
            
            continue;
        }
        if(op.operation == 'change')
        {
            if(op.operands.length < 2) { alert("Change operation requires 2 operands, "+op.operands.length+" provided!"); continue; }
            op.operands[1] = processOperand(op.operands[1], variables);
            //special case for change operation:
            //on top of its "primitive" functionality, also modify the existing variable
            let variables_copy = variables;
            while(variables_copy != null)
            {
                if(variables_copy.name == op.operands[0])
                {
                    //found the variable to change
                    variables_copy.value = op.operands[1];
                    //also change the box itself
                    let target_box_code = document.getElementById(op.operands[0]).getElementsByTagName('BOX-CODE')[0];
                    target_box_code.innerText = op.operands[1];
                    break;
                }
                variables_copy = variables_copy.next;
            }
            continue;
        }

        //process all operation operands (replace variable names with their values if applicable)
        op.operands = processOperands(op, variables);

        let call = primitives[op.operation];
        if(call != null)
        {
            if(call.needs_variables == true)
            {
                op.operands.unshift(variables);
            }
            call.function.apply(call.function, op.operands);
            continue;
        }

        //call to another box (or invalid operation)
        let spl = op.operation.split('.');
        let spl_idx = 0;
        let found = false;
        let curr = variables;
        while(curr.next != null) {
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
                    console.log("found box: ");
                    console.log(box);
                    //add new variables to pass to potential input in called box
                    console.log("adding new variables to pass to called box");
                    console.log(op.operands);
                    variables = createEmptyVariables(variables, op);
                    let new_operations = parseBox(box);
                    console.log(new_operations);
                    //add newly created variables to list of "clear on exit" variables
                    new_operations[new_operations.length - 1].operands[0] += op.operands.length;
                    operations.splice(processed_op_idx, 0, ...new_operations);
                    break;
                }
            }
            spl_idx = 0;
            curr = curr.next;
        }
        if(found == true) {continue;}
        
        //NOTE: above part is called dynamic scoping

        //box hasn't been found in existing variables, check higher scopes of original caller box
        //since the original caller is saved as the last variable, we can start checking:
        console.log("searching for box in higher scopes");
        spl_idx = 0;
        let curr_scope = curr.value.parentElement;
        console.log(curr.value.parentElement.parentElement);
        while(curr_scope.parentElement != null) 
        {
            if(curr_scope.nodeName == "BOX-CODE" || curr_scope.nodeName == "BODY")
            {
                let candidates = curr_scope.childNodes;
                candidates.forEach(candidate => 
                {
                    if(candidate.nodeName == "DATA-BOX" && candidate.id == spl[spl_idx])
                    {
                        //found the box to call
                        found = true;
                        console.log(candidate);
                        let parsed = parseBox(candidate);
                        console.log(parsed);
                        let processed = addNewVariable(null, [candidate.id, parsed]);
                        console.log(processed);

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
                            console.log("found box: ");
                            console.log(processed);
                            //add new variables to pass to potential input in called box
                            console.log("adding new variables to pass to called box");
                            console.log(op.operands);
                            variables = createEmptyVariables(variables, op);
                            let new_operations = parseBox(processed);
                            console.log(new_operations);
                            //add newly created variables to list of "clear on exit" variables
                            new_operations[new_operations.length - 1].operands[0] += op.operands.length;
                            operations.splice(processed_op_idx, 0, ...new_operations);
                            return;
                        }
                    }
                    spl_idx = 0;
                });
                //end search when we found the (nearest) fitting box
                if(found == true) {console.log("found box in higher scope, ending search..."); break;}
            }
            curr_scope = curr_scope.parentElement;
        }
        if(found == false)
        {
            console.log("no box found within scope => invalid operation");
        }
    }
}

function createEmptyVariables(variables, op)
{
    //creates empty variables (without a name), that will then be caught and "completed" by the input operation
    let new_var = variables;
    for(let i = op.operands.length -1 ; i >= 0; i--)
    {
        let curr_operand = op.operands[i];
        let tmp = new_var;
        new_var = {
            name: null,
            value: curr_operand,
            next: tmp
        };
    }
    return new_var;
}

//--------------------------------------------------------------------------------
    // Processing operand/s of operations using variables
//--------------------------------------------------------------------------------

function processOperands(op, variables)
{
    let changeModifier = 0;
    if(op.operation === "change") {changeModifier = 1;}
    for(let i = 0 + changeModifier; i < op.operands.length; i++)
    {
        op.operands[i] = processOperand(op.operands[i], variables);
    }
    return op.operands;
}

function processOperand(operand, variables)
{
    if(typeof operand === 'string')
    {
        let found = false;
        //console.log("replacing variable "+operands[i]+" with its value");
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
                console.log("found variable: " + variables_copy.name);
                console.log(variables_copy);
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
        console.log("variable not found in current scope, looking into higher scopes...");
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
                        console.log("found variable: " + candidate.id);
                        console.log(candidate);
                        let parsed = parseBox(candidate);
                        console.log(parsed);
                        let processed = addNewVariable(null, [candidate.id, parsed]);
                        console.log(processed);

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
                            console.log("found box in higher scope, ending search...");
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
        if(elem.operands[1] != Array)
        {
            variable.push({
                name: elem.operands[0],
                value: elem.operands[1]
            });
        }
        else 
        {
            //even more complex variable!
            variable.push({
                name: elem.operands[0],
                value: createComplexVariable(elem.operands[1])
            });
        }
    });
    return variable;
}

//--------------------------------------------------------------------------------
    // Primitive operations
//--------------------------------------------------------------------------------

function forward(distance)
{
    let dist = Number(distance);
    if(isNaN(dist)) { alert("forward "+distance+": distance provided is not a number!"); return; }
    turtle_position.x += Math.sin(turtle_position.rotation/180*Math.PI)*dist;
    turtle_position.y += Math.cos(turtle_position.rotation/180*Math.PI)*dist;
    canvas_draw(line = true);
}

function skip(distance)
{
    let dist = Number(distance);
    if(isNaN(dist)) { alert("skip "+distance+": distance provided is not a number!"); return; }
    turtle_position.x += Math.sin(turtle_position.rotation/180*Math.PI)*dist;
    turtle_position.y += Math.cos(turtle_position.rotation/180*Math.PI)*dist;
    canvas_draw(line = false);
}

function rotate(degrees)
{
    let deg = Number(degrees);
    if(isNaN(deg)) { alert("rotate "+degrees+": degrees provided are not a number"); return; }
    turtle_position.rotation = (turtle_position.rotation+deg)%360;
}

function log(variable)
{
    console.log("printing: " +variable);
}