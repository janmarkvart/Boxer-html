var canvas_pointer;
var canvas_context;
var canvas_x;
var canvas_y;
var canvas_rotation = 45;

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

function interpretBox(caller_box)
{
    console.log(caller_box);
    var box_code = caller_box.querySelector('box-code').childNodes;
    box_code.forEach(child => 
    {
        console.log(child);
        
        if(child.nodeType === Node.TEXT_NODE) 
        {
            console.log(child.wholeText);
            let words = child.wholeText.trim().split(/\s+/);
            words.forEach(word => {console.log(word)});
            if(words[0] == "forward") {
                console.log("call forward");
            }
            if(words[0] == "skip") {
                console.log("call skip");
            }
            if(words[0] == "rotate") {
                console.log("call rotate");
            }
            window[words[0]](words.slice(1));
        }
    }) 
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