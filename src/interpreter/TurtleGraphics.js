import * as VAR_api from "./VariableOperations.js";

var canvas_pointer = null;
var canvas_context;
var turtle_position = {x: 50, y: 30, rotation: 0};

var turtle_api = {
    setup,
    updateposition
}

var turple_primitives = {
    "forward" : {function: TG_forward, needs_variables: true },
    "skip" : {function: TG_skip, needs_variables: true },
    "left" : {function: TG_left, needs_variables: true },
    "right" : {function: TG_right, needs_variables: true }
}

export function importPrimitives()
{
    return turple_primitives;
}

export function TG_forward(variables, distance)
{
    distance = VAR_api.processOperand(variables, distance);
    let dist = Number(distance);
    if(isNaN(dist)) { alert("forward "+distance+": distance provided is not a number"); return; }
    turtle_position.x += Math.sin(turtle_position.rotation/180*Math.PI) * dist;
    turtle_position.y += Math.cos(turtle_position.rotation/180*Math.PI) * dist;
    canvas_draw(true);
}   

export function TG_skip(variables, distance)
{
    distance = VAR_api.processOperand(variables, distance);
    let dist = Number(distance);
    if(isNaN(dist)) { alert("skip "+distance+": distance provided is not a number"); return; }
    turtle_position.x += Math.sin(turtle_position.rotation/180*Math.PI) * dist;
    turtle_position.y += Math.cos(turtle_position.rotation/180*Math.PI) * dist;
    canvas_draw(false);
}

export function TG_left (variables, degrees)
{
    degrees = VAR_api.processOperand(variables, degrees);
    let deg = Number(degrees);
    if(isNaN(deg)) { alert("left "+degrees+": degrees provided are not a number"); return; }
    turtle_position.rotation = (turtle_position.rotation + deg)%360;
}

export function TG_right (variables, degrees)
{
    degrees = VAR_api.processOperand(variables, degrees);
    let deg = Number(degrees);
    if(isNaN(deg)) { alert("right "+degrees+": degrees provided are not a number"); return; }
    turtle_position.rotation = (turtle_position.rotation - deg)%360;
}

function setup(canvas_id)
{
    canvas_pointer = document.getElementById(canvas_id);
    if(canvas_pointer != null)
    {
        canvas_context = canvas_pointer.getContext("2d");
        canvas_context.beginPath();
        canvas_context.moveTo(turtle_position.x,turtle_position.y);
    }
}

function updateposition(direction, value)
{
    //TODO: delete before submit!
    switch(direction) {
        case "left":
            turtle_position.rotation = (turtle_position.rotation + value)%360;
            break;
        case "right":
            turtle_position.rotation = (turtle_position.rotation - value)%360;
            break;
        case "forward":
            turtle_position.x += Math.sin(turtle_position.rotation/180*Math.PI) * value;
            turtle_position.y += Math.cos(turtle_position.rotation/180*Math.PI) * value;
            canvas_draw(true);
            break;
        case "skip":
            turtle_position.x += Math.sin(turtle_position.rotation/180*Math.PI) * value;
            turtle_position.y += Math.cos(turtle_position.rotation/180*Math.PI) * value;
            canvas_draw(false);
            break;
    }
}

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

export default turtle_api;