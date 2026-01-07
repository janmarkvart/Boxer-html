var template_api = {
    tryAddTemplate,
    removeTemplate,
    tryGetTemplate
}

var nbspc = "&#8203 ";

var boxcode_template = 
`
<box-code contenteditable=true> </box-code>
<br>
`;

var doitbox_template = 
`
<doit-box id="newdoitbox">
<div class="box-header">
<box-name>&#8203newdoitbox</box-name>
<div class="header-right" contenteditable="false">
<button class="boxcode-hide">hide</button>
<button class="doit-execute">run</button>
<button class="deletebox">delete</button>
</div>
</div>
<box-code contenteditable=true>&#8203<br></box-code>
</doit-box>&#8203
<br>
`;

var databox_template = 
`
<data-box id="newdatabox">
<div class="box-header">
<box-name>&#8203newdatabox</box-name>
<div class="header-right" contenteditable="false">
<button class="boxcode-hide">hide</button>
<button class="templatebox">template</button>
<button class="deletebox">delete</button>
</div>
</div>
<box-code contenteditable=true>&#8203<br></box-code>
</data-box>&#8203
<br>
`

var boxer_templates = { //default templates provided by boxer-HTML
    "[": {type: "original_template", tag_name : "box-code", template: boxcode_template},
    "]": {type: "original_template", tag_name : "doit-box", template: doitbox_template},
    "{": {type: "original_template", tag_name : "data-box", template: databox_template}
}

var user_templates = {}

function tryAddTemplate(key, link) {
    if(key in boxer_templates) { return -1; } //tried to override default template
    if(key in user_templates)  { return -2; } //tried to override already existing user template
    if(key.length != 1)        { return -3; } //key must be 1 char long to be easily invoked by typing

    user_templates[key] = {type: "user_template", tag_name: "user_"+key, template: link};
    return 0;
}

function removeTemplate(key) {
    delete user_templates[key];
}

function tryGetTemplate(key) {
    if(key in boxer_templates) {
        return boxer_templates[key];
    }
    return user_templates[key];//TODO: comment behavior in thesis text
}

export default template_api;