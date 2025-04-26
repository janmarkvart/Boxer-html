var canvas_pointer;
var canvas_context;
var canvas_x;
var canvas_y;
var canvas_rotation = 45;

var primitives = {
    "forward": {function: forward, argcount: 1},
    "skip":  {function: skip, argcount: 1},
    "rotate":  {function: rotate, argcount: 1},
    "log": {function: log, argcount: 1}
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

window.onclick = function(e) 
{
    var original_target = e.target;
    if(original_target.nodeName != 'BOX-CODE' && original_target.nodeName != 'BOX-NAME'){return;}
    var target = original_target;
    while(target.nodeName != 'DOIT-BOX' && target.nodeName != 'DATA-BOX')
    {
        target = target.parentElement;
    }
    original_target.addEventListener("blur", function onleave()
    {
        original_target.spellcheck = false;
        if(original_target.nodeName == 'BOX-NAME')
        {
            target.id = original_target.innerText;
            //...
        }
        original_target.removeEventListener("blur",onleave);
    });
    if(original_target.nodeName == 'BOX-CODE')
    {
        original_target.onkeyup = function(e)
        {
            if(original_target.innerHTML.indexOf("[") > 0)
            {
                console.log("make new box-code");
                original_target.innerHTML = original_target.innerHTML.replace("[",boxcode_template);
                var box_code_list = original_target.getElementsByTagName('box-code');
                var new_box_code = box_code_list[box_code_list.length -1];
                var s = window.getSelection();
                var r = document.createRange();
                r.setStart(new_box_code, 0);
                r.setEnd(new_box_code, 1);
                s.removeAllRanges();
                s.addRange(r);
            }
            if(original_target.innerHTML.indexOf("]") > 0)
            {
                console.log("make new doit-box");
                original_target.innerHTML = original_target.innerHTML.replace("]",doitbox_template);
                var doit_box_list = original_target.getElementsByTagName('doit-box');
                var new_doit_box = doit_box_list[doit_box_list.length -1];
                var code_focus = new_doit_box.getElementsByTagName('box-code')[0];
                var s = window.getSelection();
                var r = document.createRange();
                r.setStart(code_focus, 0);
                r.setEnd(code_focus, 1);
                s.removeAllRanges();
                s.addRange(r);
            }
            if(original_target.innerHTML.indexOf("{") > 0)
            {
                console.log("make new data-box");
                original_target.innerHTML = original_target.innerHTML.replace("{",databox_template);
                var data_box_list = original_target.getElementsByTagName('data-box');
                var new_data_box = data_box_list[data_box_list.length -1];
                var code_focus = new_data_box.getElementsByTagName('box-code')[0];
                var s = window.getSelection();
                var r = document.createRange();
                r.setStart(code_focus, 0);
                r.setEnd(code_focus, 1);
                s.removeAllRanges();
                s.addRange(r);
            }
        }
    }
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
    var target = e.target;
    while(target.nodeName != 'DOIT-BOX')
    {
        target = target.parentElement;
    }
    interpretBox(target);
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

function interpretBox(caller_box, variables = null)
{
    console.log("interpreting new box");
    console.log(caller_box);
    console.log("with variables: ")
    console.log(variables);
    var operations;
    if(caller_box.nodeType == 1)
    {
        operations = parseBox(caller_box);
    }
    else
    {
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
    box_code.forEach(child => {
        if(child.nodeType == Node.TEXT_NODE)
        {
            let trimmed = child.wholeText.trim();
            if(trimmed == "") {return;}
            let words = trimmed.split(/\s+/);
            let idx = 0;
            if(current_operation.operation == null)
            {
                current_operation.operation = words[idx];
                idx++;
            }
            for(let i = idx; i < words.length; i++)
            {
                current_operation.operands.push(words[i]);
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
                    }
                    //and add new op to create variable in eval box
                    current_operation = {
                        operation: "new_var",
                        operands: [child.getElementsByTagName("BOX-NAME")[0].innerText, possible_var]
                    };
                    operations.push(current_operation);
                    current_operation = {
                        operation: null,
                        operands: []
                    };
                }
                else
                {
                    //complex databox variable
                    let complex_variable = parseBox(child);
                    if(current_operation.operation != null)
                    {
                        operations.push(current_operation);
                    }
                    //and add new op to create variable in eval box
                    current_operation = {
                        operation: "new_var",
                        operands: [child.getElementsByTagName("BOX-NAME")[0].innerText, complex_variable]
                    };
                    operations.push(current_operation);
                    current_operation = {
                        operation: null,
                        operands: []
                    };
                        
                }
            }
        }

    });
    if(current_operation.operation != null)
    {
        operations.push(current_operation);
    }
    return operations;
}

function grabBoxCode(box)
{
    return box.querySelector('box-code').childNodes;
}

function evalBox(operations, variables = null)
{
    //console.log("eval box with variables:");
    //console.log(variables);
    operations.forEach(op => {
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
            return;
        }
        if(op.operation == 'change')
        {
            change.apply(change.function, op.operands);
        }
        for(let i = 0; i< op.operands.length; i++)
        {
            if(typeof op.operands[i] === 'string')
            {
                //console.log("replacing variable "+op.operands[i]+" with its value");
                let spl = op.operands[i].split('.');
                let spl_idx = 0;
                //is variable to be translated
                let variables_copy = variables;
                while(variables_copy != null)
                {
                    //first level of lookup
                    if(variables_copy.name === spl[spl_idx])
                    {
                        variables_nested = variables_copy;
                        op.operands[i] = variables_nested.value;
                        spl_idx++;
                        //looking further into the found value (item.x etc.)
                        while(spl_idx < spl.length)
                        {
                            variables_nested.value.forEach(item => 
                            {
                                if(item.name == spl[spl_idx]) {variables_nested = item;}
                            });
                            spl_idx++;
                        }
                        op.operands[i] = variables_nested.value;
                        //console.log("value found and updated: "+op.operands[i]);
                        break;
                    }
                    variables_copy = variables_copy.next;
                }
            }
        };
        var call = primitives[op.operation];
        if(call != null)
        {
            call.function.apply(call.function, op.operands);
            return;
        }
        if(op.operation == 'repeat')
        {
            op.operands.unshift(variables);
            repeat.apply(repeat, op.operands);
        }
        if(op.operation == 'for')
        {
            op.operands.unshift(variables);
            boxer_for.apply(boxer_for, op.operands);
        }
        if(op.operation == 'if')
        {
            op.operands.unshift(variables);
            boxer_if.apply(boxer_if, op.operands);
        }
        //NEW: handling data-box variable
        if(op.operation == "new_var")
        {
            variables = addNewVariable(variables, op.operands);
        }
        if(op.operation == "nested_code") {
            interpretBox(op.operands[0], variables);
        }
        if(op.operation == "nested_doit")
        {
            interpretBox(op.operands[0], variables);
        }

        //simple call to another box (or invalid operation)
        var box = tryFindBox(op.operation);
        if(box != null)
        {
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
            interpretBox(box, new_var);
        }
    });
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
    for(let i = 0; i < times; i++)
    {
        interpretBox(box, variables);
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
            interpretBox(box, variables);
        });
    }
}

function boxer_if(variables, left, comparator, right, box)
{
    if(eval("\""+left +"\""+ comparator +"\""+ right +"\" ? true : false"))
    {
        interpretBox(box, variables);
    }
}