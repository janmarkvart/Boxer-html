var canvas_pointer;
var canvas_context;
var canvas_x;
var canvas_y;
var canvas_rotation = 45;

var primitives = {
    "forward": {function: forward, argcount: 1},
    "skip":  {function: skip, argcount: 1},
    "rotate":  {function: rotate, argcount: 1}
};

var boxcode_template = 
`
<box-code contenteditable=true>
_
</box-code>
<br>
`;

window.onclick = function(e) 
{
    var original_target = e.target;
    if(original_target.nodeName != 'BOX-CODE' && original_target.nodeName != 'BOX-NAME'){return;}
    var target = original_target;
    while(target.nodeName != 'DOIT-BOX')
    {
        target = target.parentElement;
    }
    original_target.addEventListener("blur", function onleave()
    {
        original_target.spellcheck = false;
        if(original_target.nodeName == 'BOX-NAME')
        {
            target.id = original_target.innerText;
        }
        original_target.removeEventListener("blur",onleave);
    });
    if(original_target.nodeName == 'BOX-CODE')
    {
        console.log("editing box code");
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
        }
        console.log("end of editing box code");
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
            var target = e.target;
            console.log(target);
            while(target.nodeName != 'DOIT-BOX')
            {
                target = target.parentElement;
            }
            console.log("parent found:");
            console.log(target);
            interpretBox(target);
        }
    }
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
    console.log("parsing box");
    var operations = [];
    var current_operation = {
        operation: null,
        operands: []
    };
    var box_code;
    if(caller_box.nodeName == "DOIT-BOX")
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
            if(child.nodeName == "BR")
            {
                operations.push(current_operation);
                current_operation = {
                    operation: null,
                    operands: []
                };
            }
            if(child.nodeName == "BOX-CODE")
            {
                current_operation.operands.push(child);
            }
        }

    });
    if(current_operation.operation != null)
    {
        operations.push(current_operation);
    }
    console.log("parsing done");
    return operations;
}

function grabBoxCode(box)
{
    return box.querySelector('box-code').childNodes;
}

function evalBox(operations, variables = null)
{
    console.log("eval box with variables:");
    console.log(variables);
    operations.forEach(op => {
        console.log(op);
        if(op.operation == 'input')
        {
            op.operands.forEach(operand => {
                console.log("reading input variable: ");
                console.log(operand);
                console.log(variables);
                let found = false;
                let variables_iter = variables;
                while(variables_iter != null)
                {
                    console.log("1");
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
        console.log(variables);
        for(let i = 0; i< op.operands.length; i++)
        {
            if(isNaN(Number(op.operands[i])))
            {
                console.log("replacing variable "+op.operands[i]+" with its value");
                console.log(variables);
                //is variable to be translated
                let variables_copy = variables;
                while(variables_copy != null)
                {
                    if(variables_copy.name === op.operands[i])
                    {
                        op.operands[i] = variables_copy.value;
                        console.log("value found and updated: "+op.operands[i]);
                        break;
                    }
                    variables_copy = variables_copy.next;
                }
            }
        };
        console.log(variables);
        var call = primitives[op.operation];
        if(call != null)
        {
            call.function.apply(call.function, op.operands);
            return;
        }
        if(op.operation == 'repeat')
        {
            console.log(variables);
            op.operands.unshift(variables);
            console.log(op.operands);
            repeat.apply(repeat, op.operands);
        }
        //simple call to another box
        console.log("looking for box:");
        var box = tryFindBox(op.operation);
        console.log(box);
        if(box != null)
        {
            let new_var = variables;
            for(let i = op.operands.length -1 ; i >= 0; i--)
            {
                let curr_operand = op.operands[i];
                let num = Number(curr_operand);
                if(num != NaN)
                {
                    console.log("adding new var:");
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
        //invalid operation
        //do nothing(for now?)
    });
}

function tryFindBox(box_id)
{
    return document.getElementById(box_id);
}

function forward(distance)
{
    console.log("move forward "+distance);
    canvas_x = canvas_x + Math.sin(canvas_rotation/180*Math.PI)*distance;
    canvas_y = canvas_y + Math.cos(canvas_rotation/180*Math.PI)*distance;
    canvas_context.lineTo(canvas_x,canvas_y);
    canvas_context.stroke();
}

function skip(distance)
{
    console.log("skip forward "+distance);
    canvas_x = canvas_x + Math.sin(canvas_rotation/180*Math.PI)*Number(distance);
    canvas_y = canvas_y + Math.cos(canvas_rotation/180*Math.PI)*Number(distance);
    canvas_context.moveTo(canvas_x,canvas_y);
    canvas_context.stroke();
}

function rotate(degrees)
{
    canvas_rotation = (canvas_rotation+Number(degrees))%360;
    console.log("New canvas rotation: "+canvas_rotation);
}

function repeat(variables, times, box)
{
    console.log("repeating "+box+" "+times+" times with variable: "+variables);
    for(let i = 0; i < times; i++)
    {
        console.log(i+":");
        interpretBox(box, variables);
    }
}