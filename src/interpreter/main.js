import parseBox from "./BoxParser.js";
import turtle_api from "./TurtleGraphics.js";

//--------------------------------------------------------------------------------
    // Initial Setup and canvas preparation
//--------------------------------------------------------------------------------

var primitives = {
    "forward": {function: forward, argcount: 1, needs_variables: false},
    "skip":  {function: skip, argcount: 1, needs_variables: false},
    "left": {function: left, argcount: 1, needs_variables: false},
    "right": {function: right, argcount: 1, needs_variables: false},
    "log": {function: log, argcount: 1, needs_variables: false}
};

var boxcode_template = 
`
<box-code contenteditable=true>&#8204</box-code>
<br>
`;

var doitbox_template = 
`
<doit-box id="newdoitbox">
<div class="box-header">
<box-name>newdoitbox</box-name>
<div class="header-right" contenteditable="false">
<button class="boxcode-hide">hide</button>
<button class="doit-execute">run</button>
<button class="deletebox">delete</button>
</div>
</div>
<box-code contenteditable=true>&#8204</box-code>
</doit-box>&#8204
<br>
`;

var databox_template = 
`
<data-box id="newdatabox">
<div class="box-header">
<box-name>newdatabox</box-name>
<div class="header-right" contenteditable="false">
<button class="boxcode-hide">hide</button>
<button class="templatebox">template</button>
<button class="deletebox">delete</button>
</div>
</div>
<box-code contenteditable=true>&#8204</box-code>
</data-box>&#8204
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
    let canvas_id = "main-canvas";
    turtle_api.setup(canvas_id);
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
    //add ability to create template from data-box
    let box_templaters = document.getElementsByClassName("templatebox");
    for (let i = 0; i < box_templaters.length; i++) {
        let element = box_templaters[i];
        element.onclick = function(e) {
            boxTemplateToggle(e);
        }
    }
}

function boxHeaderRun(e) 
{
    //finds and calls the box that was clicked on
    let target = e.target;
    while(target.nodeName != 'DOIT-BOX')
    {
        target = target.parentElement;
    }
    //add a "initial scope" variable for traversing into higher scopes during box lookup
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
    //handles minimizing box-code section of boxes
    let target = e.target;
    while(target.nodeName != 'DOIT-BOX' && target.nodeName != 'DATA-BOX')
    {
        target = target.parentElement;
    }
    let target_hide_button = target.getElementsByClassName("boxcode-hide")[0];
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
    //handles box deletion
    let target = e.target;
    while(target.nodeName != 'DOIT-BOX' && target.nodeName != 'DATA-BOX')
    {
        target = target.parentElement;
    }
    if( confirm("Are you sure you want to delete this box?") == true) { target.remove(); }
}
function boxTemplateToggle(e)
{
    console.log("I am template manager...");
    let target = e.target;
    while(target.nodeName != 'DATA-BOX')
    {
        target = target.parentElement;
    }
    if(target.id.length != 1) {
        //since the templates are invoked by a single key press, templates with multiple-char names are invalid
        alert( "Could not create template: make sure data-box name is only 1 character long!" );
        return;
    }
    if(target.classList.contains('activetemplate'))
    {
        target.classList.remove('activetemplate');
        target.getElementsByTagName("BOX-NAME")[0].setAttribute("contenteditable", "true");
    }
    else
    {
        target.classList.add('activetemplate');
        target.getElementsByTagName("BOX-NAME")[0].setAttribute("contenteditable", "false");
    }
}

//--------------------------------------------------------------------------------
    // Event handling for contenteditable elements and template insertion
//--------------------------------------------------------------------------------

window.onclick = function(e) 
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
        //checks initial box name to see if box served as a user-defined template
        let separated_id = box_id.split('_');
        if(separated_id.length === 3 &&  separated_id[0] === "key" && separated_id[1].length === 1 
            && separated_id[2] === "template" && target.nodeName == 'DATA-BOX')
        {
            //data-box was a template when we entered it
            was_user_template = true;
            previous_key = separated_id[1];
        }
    }

    document.activeElement.addEventListener("blur", function onleave()
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
                if(previous_key != null && current_key != previous_key)
                {
                    //key changed, remove old template
                    delete boxer_templates[previous_key];
                }
                //create new user-defined template
                boxer_templates[current_key] = {tag_name: 'user_'+current_key, template: target.getElementsByTagName('BOX-CODE')[0].innerHTML};
            }
            else if(was_user_template == true)
            {
                //box no longer serves as a template
                delete boxer_templates[previous_key];
            }
        }
        if(original_target.nodeName == 'BOX-CODE')
        {
            if(was_user_template == true)
            {
                //box is a template, update its contents
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
            console.log(document.getSelection().focusNode.parentElement);
        }
        this.document.activeElement.onkeydown = function(e)
        {
            if( e.key === "Backspace" || e.key === "Delete")
            {
                if(document.getSelection().anchorOffset <= 1)
                {
                    console.log("stop!");
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        }
    }
}

function insertBox(original_target, key)
{
    //inserts a new box into the program, based on the key pressed
    let box_template = boxer_templates[key];
    templateInserter(original_target, key, box_template.template);
    
    if(key == "[" || key == "]" || key == "{")
    {
        //one of default templates, place focus into newly added box's box-code for ease of use
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
                //add event listeners
                let newbox = child.nextSibling;
                if(newbox.nodeType != Node.ELEMENT_NODE) { newbox = newbox.nextSibling; }
                templateEventAdder(newbox);
            }
        }
        if(child.nodeName == 'DATA-BOX' || child.nodeName == 'DOIT-BOX')
        {
            templateInserter(child.getElementsByTagName('BOX-CODE')[0], key, template);
        }
    });
}

function templateEventAdder(newbox)
{
    let hide_headers = newbox.getElementsByClassName("boxcode-hide");
    for(let i = 0; i < hide_headers.length; i++)
    {
        let elem = hide_headers[i];
        elem.onclick = function(e) { boxHeaderShowHide(e); }
    }

    let show_headers = newbox.getElementsByClassName("boxcode-show");
    for(let i = 0; i < show_headers.length; i++)
    {
        let elem = show_headers[i];
        elem.onclick = function(e) { boxHeaderShowHide(e); }
    };

    let run_headers = newbox.getElementsByClassName("doit-execute");
    for(let i = 0; i < run_headers.length; i++)
    {
        let elem = run_headers[i];
        elem.onclick = function(e) { boxHeaderRun(e); }
    };
    
    let delete_headers = newbox.getElementsByClassName("deletebox");
    for(let i = 0; i < delete_headers.length; i++)
    {
        let elem = delete_headers[i];
        elem.onclick = function(e) { boxHeaderDelete(e); }
    };

    let box_templaters = newbox.getElementsByClassName("templatebox");
    for (let i = 0; i < box_templaters.length; i++) {
        let elem = box_templaters[i];
        elem.onclick = function(e) { boxTemplateToggle(e); }
    }
}

//--------------------------------------------------------------------------------
    // Process the html syntax into operations to be evaluated
//--------------------------------------------------------------------------------

function interpretBox(variables, caller_box)
{
    //interpretation of the original caller box
    let operations = parseBox(caller_box);
    evalBox(operations, variables);
}

//--------------------------------------------------------------------------------
    // Main evaluation function
//--------------------------------------------------------------------------------

function evalBox(operations, variables = null)
{
    let processed_op_idx = 0;
    while(processed_op_idx < operations.length)
    {
        let op = operations[processed_op_idx];
        processed_op_idx++;
        if(op.operation == 'input')
        {
            //catches previously passed variable values into names provided by input operands
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
            //clear variables at the end of their lifetime (current scope)
            let variables_copy = variables;
            for(let i = 0; i < op.operands[0]; i++)
            {
                variables_copy = variables_copy.next;
            }
            variables = variables_copy;
            continue;
        }
        
        //variable creation
        if(op.operation == "new_var" || op.operation == "nested_doit")
        {
            //create new variable
            variables = addNewVariable(variables, op.operands);
            continue;
        }

        if(op.operation == "nested_code")
        {
            //add nested code into evaluation as a inner scope
            let box = op.operands[0];
            let new_operations = parseBox(box);
            operations.splice(processed_op_idx, 0, ...new_operations);
            continue;
        }
        if(op.operation == "repeat")
        {
            if(op.operands.length < 2) { alert("Repeat operation requires 2 operands, "+op.operands.length+" provided!"); continue; }
            let times = Number(processOperand(op.operands[0], variables));
            if(isNaN(times)) { alert("Repeat: first operand has to be a number!"); continue; }
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
                    if(elem.value !== undefined && elem.value.nodeName != "BOX-CODE")
                    {
                        variables = {
                            name: iter,
                            value: elem.value,
                            next: variables
                        };
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
        if(op.operation == "change")
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
                    break;
                }
                variables_copy = variables_copy.next;
            }
            //also update the box itself
            let target_box = document.getElementById(op.operands[0]);
            if(target_box != null)
            {
                if(target_box.nodeName == "DATA-BOX" || target_box.nodeName == "DOIT-BOX")
                {
                    let target_box_code = target_box.getElementsByTagName('BOX-CODE')[0];
                    target_box_code.innerText = op.operands[1];
                }
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
                    //add new variables to pass to potential input in called box
                    variables = createEmptyVariables(variables, op);
                    let new_operations = parseBox(box);
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
        spl_idx = 0;
        let curr_scope = curr.value.parentElement;
        while(curr_scope.parentElement != null) 
        {
            if(curr_scope.nodeName == "BOX-CODE" || curr_scope.nodeName == "BODY")
            {
                let candidates = curr_scope.childNodes;
                candidates.forEach(candidate => 
                {
                    if(candidate.nodeName == "DOIT-BOX" && candidate.id == spl[spl_idx])
                    {
                        found = true;
                        variables = createEmptyVariables(variables, op);
                        let new_operations = parseBox(candidate);
                        new_operations[new_operations.length - 1].operands[0] += op.operands.length;
                        operations.splice(processed_op_idx, 0, ...new_operations);
                        return;
                    }
                    if(candidate.nodeName == "DATA-BOX" && candidate.id == spl[spl_idx])
                    {
                        //found the box to call
                        found = true;
                        let parsed = parseBox(candidate);
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
                            //add new variables to pass to potential input in called box
                            variables = createEmptyVariables(variables, op);
                            let new_operations = parseBox(processed);
                            //add newly created variables to list of "clear on exit" variables
                            new_operations[new_operations.length - 1].operands[0] += op.operands.length;
                            operations.splice(processed_op_idx, 0, ...new_operations);
                            return;
                        }
                    }
                    spl_idx = 0;
                });
                //end search when we found the (nearest) fitting box
                if(found == true) { break; }
            }
            curr_scope = curr_scope.parentElement;
        }
        if(found == false)
        {
            console.debug(op.operation+": no box found within scope => invalid operation/comment");
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
    for(let i = 0; i < op.operands.length; i++)
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
                        let parsed = parseBox(candidate);
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
    turtle_api.updateposition("forward", dist);
}

function skip(distance)
{
    let dist = Number(distance);
    if(isNaN(dist)) { alert("skip "+distance+": distance provided is not a number!"); return; }
    turtle_api.updateposition("skip", dist);
}

function left(degrees)
{
    let deg = Number(degrees);
    if(isNaN(deg)) { alert("rotate "+degrees+": degrees provided are not a number"); return; }
    turtle_api.updateposition("left", deg);
}

function right(degrees)
{
    let deg = Number(degrees);
    if(isNaN(deg)) { alert("rotate "+degrees+": degrees provided are not a number"); return; }
    turtle_api.updateposition("right", deg);
}

function log(variable)
{
    console.log("printing: " +variable);
}