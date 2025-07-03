var canvas_pointer;
var canvas_context;
var canvas_x;
var canvas_y;
var canvas_rotation = 45;

var primitives = {
    "forward": {function: forward, argcount: 1, needs_variables: false},
    "skip":  {function: skip, argcount: 1, needs_variables: false},
    "rotate":  {function: rotate, argcount: 1, needs_variables: false},
    "log": {function: log, argcount: 1, needs_variables: false},
    "nested_code": {function: interpretBox, argcount: 2, needs_variables: true},//TODO: rework this
    "change": {function: change, argcount: 2, needs_variables: false}
    //"repeat": {function: repeat, argcount: 3, needs_variables: true},
    //"for": {function: boxer_for, argcount: 4, needs_variables: true},
    //"if": {function: boxer_if, argcount: 4, needs_variables: true}
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

window.onclick = function(e) 
{
    var original_target = e.target;
    if(original_target.nodeName != 'BOX-CODE' && original_target.nodeName != 'BOX-NAME'){return;}
    var target = original_target;
    while(target.nodeName != 'DOIT-BOX' && target.nodeName != 'DATA-BOX')
    {
        target = target.parentElement;
    }
    var box_id = target.id;
    var was_user_template = false;
    var previous_key = null;
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
            for(var key in boxer_templates)
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
    var box_template = boxer_templates[key];
    templateInserter(original_target, key, box_template.template);
    
    if(key == "[" || key == "]" || key == "{")
    {
        //one of default templates
        var box_list = original_target.getElementsByTagName(box_template.tag_name);
        var new_box = box_list[box_list.length -1];
        if(box_template.tag_name != "box-code")
        {
            new_box = new_box.getElementsByTagName('box-code')[0];
        }
        var s = window.getSelection();
        var r = document.createRange();
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

window.onload = function() 
{
    //prepare canvas to be callable by boxer functions
    var canvas_pointer = document.getElementById('main-canvas');
    if(canvas_pointer != null)
    {
        canvas_context = canvas_pointer.getContext("2d");
        canvas_context.beginPath();
        canvas_context.moveTo(20,20);
        canvas_x = 20;
        canvas_y = 20;
    }
    //add execute functionality to doit-boxes
    var doit_runners = document.getElementsByClassName("doit-execute");
    for (let i = 0; i < doit_runners.length; i++) {
        var element = doit_runners[i];
        element.onclick = function(e) {
            boxHeaderRun(e);
        }
    }
    //add show/hide box-code functionality to boxes
    var doit_runners = document.getElementsByClassName("boxcode-hide");
    for (let i = 0; i < doit_runners.length; i++) {
        var element = doit_runners[i];
        element.onclick = function(e) {
            boxHeaderShowHide(e);
        }
    }
    //add ability to delete box
    var doit_runners = document.getElementsByClassName("deletebox");
    for (let i = 0; i < doit_runners.length; i++) {
        var element = doit_runners[i];
        element.onclick = function(e) {
            boxHeaderDelete(e);
        }
    }
}

function boxHeaderRun(e) 
{
    //find the box that was clicked on
    var target = e.target;
    while(target.nodeName != 'DOIT-BOX')
    {
        target = target.parentElement;
    }
    var initial_variable = 
    {
        name: "originalscope",
        value: target,
        next: null
    }
    interpretBox(initial_variable, target);
}
function boxHeaderShowHide(e) 
{
    var target = e.target;
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
    var target = e.target;
    while(target.nodeName != 'DOIT-BOX' && target.nodeName != 'DATA-BOX')
    {
        target = target.parentElement;
    }
    if( confirm("Are you sure you want to delete this box?") == true) { target.remove(); }
}

function interpretBox(variables, caller_box)
{
    console.log("interpreting new box");
    console.log(caller_box);
    console.log("with variables: ")
    console.log(variables);
    var operations;
    if(caller_box.nodeType == 1)
    {
        //standalone box-code
        operations = parseBox(caller_box);
    }
    else
    {
        //doit-box or data-box
        var box = document.getElementById(caller_box);
        operations = parseBox(box);
    }
    console.log("list of operations to eval");
    console.log(operations);
    evalBox(operations, variables);
}

function parseBox(caller_box) 
{
    var operations = [];
    var variables = [];
    var nested_doits = [];
    var current_operation = {
        operation: null,
        operands: []
    };
    var box_code;
    if(caller_box.nodeName == "DOIT-BOX" || caller_box.nodeName == "DATA-BOX")
    {
        box_code = grabBoxCode(caller_box);
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
            let trimmed = child.wholeText.trim();
            if(trimmed == "") {continue;}
            let words = trimmed.split(/\s+/);
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

function grabBoxCode(box)
{
    return box.querySelector('box-code').childNodes;
}

function evalBox(operations, variables = null)
{
    //console.log("eval box with variables:");
    //console.log(variables);
    var processed_op_idx = 0;
    console.log(operations);
    while(processed_op_idx < operations.length)
    {
        let op = operations[processed_op_idx];
        processed_op_idx++;
        console.log(processed_op_idx);
        console.log("processing operation: ");
        console.log(op.operation);
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
            for(let i = 0; i < op.operands; i++)
            {
                console.log("clearing variable: " + variables_copy.name);
                variables_copy = variables_copy.next;
            }
            variables = variables_copy;
            continue;
        }
        
        //process operation operands (replace variable names with their values if applicable)
        op.operands = processOperands(op, variables);

        if(op.operation == 'change')
        {
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
        }

        var call = primitives[op.operation];
        if(call != null)
        {
            if(call.needs_variables == true)
            {
                op.operands.unshift(variables);
            }
            call.function.apply(call.function, op.operands);
            continue;
        }
        if(op.operation == "new_var" || op.operation == "nested_doit")
        {
            console.log("creating new variable or nested doit box");
            //create new variable (whether data or nested doit)
            variables = addNewVariable(variables, op.operands);
            continue;
        }

        //operations that (potentially) call other boxes
        if(op.operation == "repeat")
        {
            console.log(op.operands);
            let times = Number(op.operands[2]);
            let box = op.operands[3];
            for(let i = 0; i < times; i++)
            {
                var new_operations = parseBox(box);
                operations.splice(processed_op_idx, 0, ...new_operations);
            }
            continue;
        }
        if(op.operation == "for")
        {
            console.log(op.operands);
            let iter = op.operands[0];
            let check = op.operands[1];
            let source = op.operands[2];
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
                        var new_operations = parseBox(box);
                        let combined = new_operations.concat([{operation: "clear", operands: [1]}]);
                        operations.splice(processed_op_idx, 0, ...combined);
                    }
                };
            }
            continue;
        }
        if(op.operation == "if")
        {
            let left = op.operands[0];
            let comparator = op.operands[1];
            let right = op.operands[2];
            let box = op.operands[3];
            //TODO: try-catch
            if(eval("\""+left +"\""+ comparator +"\""+ right +"\" ? true : false"))
            {
                var new_operations = parseBox(box);
                operations.splice(processed_op_idx, 0, ...new_operations);
            }
            continue;
        }

        //call to another box (or invalid operation)
        var found = false;
        var curr = variables;
        while(curr.next != null) {
            if(curr.name == op.operation)
            {
                //found the box to call
                found = true;
                let box = curr.value;
                //add new variables to pass to potential input in called box
                variables = createEmptyVariables(variables, op);
                var new_operations = parseBox(box);
                console.log(new_operations);
                //add newly created variables to list of "clear on exit" variables
                new_operations[new_operations.length - 1].operands[0] += op.operands.length;
                operations.splice(processed_op_idx, 0, ...new_operations);
                break;
            }
            curr = curr.next;
        }
        if(found == true) {continue;}
        //NOTE: above part is called dynamic scoping

        //box hasn't been found in existing variables, check higher scopes of original caller box
        //since the original caller is saved as the last variable, we can start checking:
        console.log("searching for box in higher scopes");
        var curr_scope = curr.value.parentElement;
        console.log(curr.value.parentElement.parentElement);
        while(curr_scope.parentElement != null) 
        {
            //TODO: perhaps introducing a top-level "WORLD" box/es would be better than using body
            //(also more in line with the original boxer/sunrise) 
            if(curr_scope.nodeName == "BOX-CODE" || curr_scope.nodeName == "BODY")
            {
                var candidates = curr_scope.childNodes;
                candidates.forEach(candidate => 
                {
                    //console.log(candidate);
                    if(candidate.nodeType == Node.ELEMENT_NODE && candidate.id == op.operation)
                    {
                        //found the box to call
                        found = true;
                        let box = candidate.getElementsByTagName('BOX-CODE')[0];
                        //add new variables to pass to potential input in called box
                        variables = createEmptyVariables(variables, op);
                        var new_operations = parseBox(box);
                        console.log(new_operations);
                        //add newly created variables to list of "clear on exit" variables
                        new_operations[new_operations.length - 1].operands[0] += op.operands.length;
                        operations.splice(processed_op_idx, 0, ...new_operations);
                        return;
                    }
                });
                //end search when we found the (nearest) fitting box
                console.log("found box in higher scope, ending search...");
                if(found == true) {break;}
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
        let num = Number(curr_operand);
        if(num != NaN)
        {
            let tmp = new_var;
            new_var = {
                name: null,
                value: num,
                next: tmp
            };
        }
    }
    return new_var;
}

function processOperands(op, variables)
{
    let changeModifier = 0;
    if(op.operation === "change") {changeModifier = 1;}
    for(let i = 0 + changeModifier; i < op.operands.length; i++)
    {
        if(typeof op.operands[i] === 'string')
        {
            let found = false;
            //console.log("replacing variable "+operands[i]+" with its value");
            let spl = op.operands[i].split('.');
            let spl_idx = 0;
            //is variable to be translated
            let variables_copy = variables;
            while(variables_copy != null)
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
                        variables_nested.value.forEach(item => 
                        {
                            if(item.name == spl[spl_idx]) {variables_nested = item; found = true;}
                        });
                        spl_idx++;
                    }
                    if(found) 
                    {
                        op.operands[i] = variables_nested.value;
                    }
                    else
                    {
                        op.operands[i] ="err";
                    }
                    break;
                }
                variables_copy = variables_copy.next;
            }
            //TODO: if variable not found, similarly to how called doit boxes are looked up,
            //look into higher scopes of the original caller box to see if the desired variable is defined there
        }
    }
    return op.operands;
}

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

function tryFindBox(box_id)
{
    //deprecated
    return document.getElementById(box_id);
}

function forward(distance)
{
    canvas_x = canvas_x + Math.sin(canvas_rotation/180*Math.PI)*distance;
    canvas_y = canvas_y + Math.cos(canvas_rotation/180*Math.PI)*distance;
    canvas_context.lineTo(canvas_x,canvas_y);
    canvas_context.stroke();
}

function skip(distance)
{
    canvas_x = canvas_x + Math.sin(canvas_rotation/180*Math.PI)*Number(distance);
    canvas_y = canvas_y + Math.cos(canvas_rotation/180*Math.PI)*Number(distance);
    canvas_context.moveTo(canvas_x,canvas_y);
    canvas_context.stroke();
}

function rotate(degrees)
{
    canvas_rotation = (canvas_rotation+Number(degrees))%360;
}

function repeat(variables, times, box)
{
    //deprecated
    for(let i = 0; i < times; i++)
    {
        interpretBox(variables, box);
    }
}

function log(variable)
{
    console.log("printing: " +variable);
}

function change(box_id, new_text)
{
    var target_box_code = document.getElementById(box_id).getElementsByTagName('BOX-CODE')[0];
    target_box_code.innerText = new_text;
}

function boxer_for(variables, iter, check, source, box)
{
    //deprecated
    console.log(variables);
    console.log(iter);
    console.log(check);
    console.log(source);
    if(check == "in")
    {
        source.forEach(elem => 
        {
            let new_var = [iter, elem.value];
            variables = addNewVariable(variables, new_var);
            interpretBox(variables, box);
        });
    }
}

function boxer_if(variables, left, comparator, right, box)
{
    //deprecated
    if(eval("\""+left +"\""+ comparator +"\""+ right +"\" ? true : false"))
    {
        interpretBox(variables, box);
    }
}