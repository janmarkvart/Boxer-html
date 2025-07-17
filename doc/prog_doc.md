# Boxer-HTML - programmer documentation

Boxer-HTML is written using HTML for code syntax, with JavaScript as interpreter and CSS for styling.

### Boxes

The main building block of Boxer-HTML is a `box`. Boxes serve as a way to define a region of space serving some sort of function. There are three types of boxes. 

#### Data-box

The first is a `data-box`, and serves as a way to define variables. Complex variables are formed by nesting multiple boxes into each other and accessed through the dot syntax: `databox.nestedbox`.

##### Doit-box

In contrast to the data-box, a `doit-box` serves as a way to define a block of executable code. It is available to be executed using the header `run` button. The contents of a doit-box are also inacessible from the outside.

##### Box-code

The standalone box-code serves as a way to create a variation of doit-box which, instead of being called directly, is instead automatically executed as part of a parent box. All boxes defined within are inacessinble from the outside.

### Primitives

Primitives are simple operations that do not warrant a box. They can be split by function into canvas drawing operations, control flow operations, variable-related operations, and the remaining `change` and `log` operations. 

### Evaluation

#### Data Structures

Boxer-HTML uses two main data structures during evaluation. The first is a linked list of variables, which works on a LIFO basis. Each variable contains a name and a value, which can be either a string, box-code or a list of nested variables. The second is a list of

#### Parsing

The first step of evaluation involves parsing the underlying HTML syntax into a list of operations, which are then executed. The `parseBox` function is used for this purpose. parsed operations are sorted into three categories: variables, nested code, and primitives. These categories are then merged in the same order, which ensures that all variables and nested code are ready for use before the first operation can attempt accessing them. This optimization means that the following execution process can easily iterate through the operations without major complications.

#### Execution

##### Variable completion

As we know from Parsing, the first group of operation to be executed are variable definitions. This process involves transforming the operands of the `new_var` operation into a variable with a distinct name and value. This variable is then added to the variables linked list.

##### Nested Code

Following the variable completion is nested code handling. If the nested code came from a `box-code` standalone, it is parsed and its operations are added into the main operations list, to be executed right after this operation.
In the case of a nested code from a `doit-box`, it is instead added as a variable into the linked list.

##### Operand Processing

Before we can execute a operation, we first must prepare its operands. The `processOperand` function first traverses the variables linked list and looks for a variable with the same name. If one is found, the operand is replaced with the variable value. 

##### Primitive Execution

##### Canvas Operations

There are 4 operations that serve as a way to draw shapes on the canvas. they are `forward`, `skip`, `left` and `right`. Forward draws a line in the current direction (default is directly down), while skip moves forward without drawing. Left and right then serve to rotate the direction of drawing.

##### Control Flow Operations

Operations `repeat`, `for` and `if` are used to modify the flow of code execution. the `repeat` operations executes the provided box code n times, while `for` iterates over a nested boxes of a provided box and passes the current iteration into the provided box code.
The `if` operation only executes the provided box if the condition is true.

##### Box calls

Within a box, the user has the ability to call another box within the program. This is done by simply typing the box name as a operation. Additionaly, the user can pass `arguments` into this called box. The called box can then receive them using the `input` operation.

##### Input

When calling another box, the user can potentially pass arguments to it. These arguments are caught using the `input` operation. 

##### Change

The change primitive is a unique operation in that it is the only one that can modify the program. It takes a box within the program, and replaces its box-code contents with another box contents.

##### Log

Log is by far the simples primitive operation, and serves as a way to write its argument into the JavaScript Console.

##### Copy and Execute

One major property of Boxer-HTML evaluation is the `copy-and-execute` model. When another box is called, instead of context switching the evaluation into it and returning once its evaluation is complete, its code is instead copied into the caller box and executed as part of it. Hovewer, this means that we need a different process for ending the lifetime of variables that were defined only for the called box. For this, there exists a secret primitive `clear`, which deletes the last `n` variables from the linked list. The calculation of how many variables to delete is done as part of the parse process, and each variable passed as an argument further increment this number.

##### Scope

Following the original Boxer, Boxer-HTML uses a combination of static and dynamic scoping. When a box lookup begins, we begin with the dynamic scoping first. This means that the linked list of variables is traversed and the first occurence of the box found is returned. In the case that no fitting box was found in the linked list, the static part begins. During this step, we begin inside the scope of the originally executed box, and rise into its parent boxes to look for the desired box, until we reach the global scope.