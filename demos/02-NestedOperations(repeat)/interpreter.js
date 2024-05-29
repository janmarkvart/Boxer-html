var canvas_pointer;
var canvas_context;
var canvas_x;
var canvas_y;
var canvas_rotation = 45;

var primitives = {
    "forward": {function: forward, argcount: 1},
    "skip":  {function: skip, argcount: 1},
    "rotate":  {function: rotate, argcount: 1},
    "repeat":  {function: repeat, argcount: 2}
};

var boxcode_template = 
`
<box-code contenteditable=true>
-
</box-code>
`;

window.onclick = function(e) 
{
    var original_target = e.target;
    console.log(original_target);
    if(original_target.nodeName == 'BODY'){return;}
    var target = original_target;
    while(target.nodeName != 'DOIT-BOX')
    {
        target = target.parentElement;
    }
    console.log("parent found");
    console.log(target);
    if(original_target.nodeName == 'BOX-CODE')
    {
        console.log("editing box code");
        original_target.onkeyup = function(e)
        {
            if(original_target.innerHTML.indexOf("[") > 0)
            {
                console.log("make new box-code");
                original_target.innerHTML = original_target.innerHTML.replace("[",boxcode_template);
                var p = original_target.getElementsByTagName('box-code')[0];
                console.log(p);
                var s = window.getSelection();
                var r = document.createRange();
                r.setStart(p, 0);
                r.setEnd(p, 0);
                s.removeAllRanges();
                s.addRange(r);
            }
        }
        console.log("end of editing box code");
    }
    if(original_target.nodeName == 'BOX-NAME')
    {
        console.log("creating focusout event for name");
        console.log(target);
        original_target.addEventListener("blur", function onleave()
        {
            console.log("left");
            target.id = original_target.innerText;
            original_target.removeEventListener("blur",onleave);
        });
        console.log("end of focusout event");
    }
    else
    {
        interpretBox(target);
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
}

function interpretBox(caller_box)
{
    console.log(caller_box);
    var operations;
    if(caller_box.nodeType == 1)
    {
        console.log("box");
        operations = parseBox(caller_box);
    }
    else
    {
        console.log("text");
        var box = document.getElementById(caller_box);
        operations = parseBox(box);
    }
    console.log(operations);
    evalBox(operations);
}

function parseBox(caller_box) 
{
    console.log(caller_box);
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
        console.log(child);
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
                console.log("box");
                current_operation.operands.push(child);
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

function evalBox(operations)
{
    variables = {};
    operations.forEach(op => {
        console.log(op);
        var call = primitives[op.operation];
        if(call != null)
        {
            call.function.apply(call.function, op.operands);
        }
    });
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

function repeat(times, box)
{
    console.log("repeating "+box+" "+times+" times:");
    for(let i = 0; i < times; i++)
    {
        console.log(i+":");
        interpretBox(box);
    }
}