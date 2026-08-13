---
title: "Node edit dialog"
sidebar:
  order: 10
---

The edit dialog for a node is the main way a user can configure the node to
do what they want.

The dialog should be intuitive to use and be consistent in its design and appearance
when compared to other nodes.

The edit dialog is provided in the [node's HTML file](node-html), inside a
`<script>` tag:

```html
<script type="text/html" data-template-name="node-type">
    <!-- edit dialog content  -->
</script>
```

 - The `<script>` tag should have a `type` of `text/html` - this will help most
   text editors to provide proper syntax highlighting. It also prevents the browser
   from treating it like normal HTML content when the node is loaded into the editor.
 - The tag should have its `data-template-name` set to the type of the node its
   the edit dialog for. This is how the editor knows what content to show when
   editing a particular node.

The edit dialog will typically be made up from a series of rows - each containing
a label and input for a different property

```html
<div class="form-row">
    <label for="node-input-name"><i class="fa fa-tag"></i> Name</label>
    <input type="text" id="node-input-name" placeholder="Name">
</div>
```

- Each row is created by a `<div>` with class `form-row`
- A typical row will have a `<label>` that contains an icon and the name of the
  property followed by an `<input>`. The icon is created using an `<i>` element
  with a class taken from those available from [Font Awesome 4.7](https://fontawesome.com/v4.7.0/icons/).
- The form element containing the property must have an id of `node-input-<propertyname>`. In the case of Configuration nodes, the id must be `node-config-input-<property-name>`.
- The `<input>` type can be either `text` for string/number properties, or
`checkbox` for boolean properties. Alternatively, a `<select>` element can be
used if there is a restricted set of choices.


Node-RED provides some standard UI widgets that can be used by nodes to create a
richer and more consistent user experience.

## Buttons

To add a button to the edit dialog, use the standard `<button>` HTML element and
give it the class `red-ui-button`.

<table class="ui-examples" tabindex="0">
<tr>
<td>
    <p class="ui-example-label">Plain button</p>
    <button type="button" class="red-ui-button">Button</button>
</td>
<td>
<pre>&lt;button type="button" class="red-ui-button"&gt;Button&lt;/button&gt;</pre>
</td>
</tr>
<tr>
<td>
    <p class="ui-example-label">Small button</p>
    <button type="button" class="red-ui-button red-ui-button-small">Button</button>
</td>
<td>
<pre>&lt;button type="button" class="red-ui-button red-ui-button-small"&gt;Button&lt;/button&gt;</pre>
</td>
</tr>
<tr>
<td>
<p class="ui-example-label">Toggle button group</p>
<span class="button-group">
<button type="button" class="red-ui-button toggle my-button-group selected">b1</button><button type="button" class="red-ui-button toggle my-button-group">b2</button><button type="button" class="red-ui-button toggle my-button-group">b3</button>
</span>
</td>
<td>
<div class="figure">
<pre>&lt;span class="button-group"&gt;
&lt;button type="button" class="red-ui-button toggle selected my-button-group"&gt;b1&lt;/button&gt;&lt;button type="button" class="red-ui-button toggle my-button-group"&gt;b2&lt;/button&gt;&lt;button type="button" class="red-ui-button toggle my-button-group"&gt;b3&lt;/button&gt;
&lt;/span&gt;
</pre>
<p class="caption">HTML</p>
</div>
<div class="figure">
<pre>$(".my-button-group").on("click", function() {
    $(".my-button-group").removeClass("selected");
    $(this).addClass("selected");
})</pre>
<p class="caption">oneditprepare</p>
</div>
<p>To toggle the <code>selected</code> class on the active button, you will need to add code to
the <code>oneditprepare</code> function to handle the events.</p>
<p><i>Note:</i> avoid whitespace between the <code>&lt;button&gt;</code> elements as the <code>button-group</code> span does not currently collapse whitespace properly. This will be addressed in the future.</p>
</td>
</tr>


</table>



## Inputs

For simple text entry, the standard `<input>` element can be used.

In some cases, Node-RED provides the `TypedInput` widget as an alternative.
It allows the user a way to specify the type of the property as well as its value.

For example, if a property could be a String, number or boolean. Or if the property
is being used to identify message, flow or global context property.

It is a jQuery widget that requires code to be added to the node's `oneditprepare` function
in order to add it to the page.

Full API documentation for the `TypedInput` widget, including a list of the available
built-in types is available [here](/docs/api/ui/typedInput/).

<table class="ui-examples" tabindex="0">
<tr>
    <td>
        <p class="ui-example-label">Plain HTML Input</p>
        <input type="text" id="node-input-name" aria-label="Plain HTML input example">
    </td>
    <td>
    <pre>&lt;input type="text" id="node-input-name"&gt;</pre>
    </td>
</tr>
<tr>
    <td>
        <p class="ui-example-label">TypedInput<br>String/Number/Boolean</p>
        <nr-typed-input config='{"type":"str","types":["str","num","bool"]}' aria-label="TypedInput example: string, number or boolean"></nr-typed-input>
    </td>
    <td>
        <div class="figure">
            <pre>&lt;input type="text" id="node-input-example1"&gt;
&lt;input type="hidden" id="node-input-example1-type"&gt;
</pre>
            <p class="caption">HTML</p>
        </div>
        <div class="figure">
            <pre>$("#node-input-example1").typedInput({
    type:"str",
    types:["str","num","bool"],
    typeField: "#node-input-example1-type"
})</pre>
            <p class="caption">oneditprepare</p>

            When the TypedInput can be set to multiple types, an extra node
            property is required to store information about the type. This
            is added to the edit dialog as a hidden <code>&lt;input&gt;</code>.
         </div>
    </td>
</tr>

<tr>
    <td>
        <p class="ui-example-label">TypedInput<br>JSON</p>
        <nr-typed-input config='{"type":"json","types":["json"]}' value="{&quot;a&quot;: 123}" aria-label="TypedInput example: JSON"></nr-typed-input>
    </td>
    <td>
        <div class="figure">
            <pre>&lt;input type="text" id="node-input-example2"&gt;</pre>
            <p class="caption">HTML</p>
        </div>
        <div class="figure">
            <pre>$("#node-input-example2").typedInput({
    type:"json",
    types:["json"]
})</pre>
            <p class="caption">oneditprepare</p>
        The JSON type includes a button that will open up a dedicated JSON Edit
        Dialog (disabled in this demo).
         </div>
    </td>
</tr>
<tr>
    <td>
        <p class="ui-example-label">TypedInput<br>msg/flow/global</p>
        <nr-typed-input config='{"type":"msg","types":["msg","flow","global"]}' value="payload" aria-label="TypedInput example: msg, flow or global property"></nr-typed-input>
    </td>
    <td>
        <div class="figure">
            <pre>&lt;input type="text" id="node-input-example3"&gt;
&lt;input type="hidden" id="node-input-example3-type"&gt;</pre>
            <p class="caption">HTML</p>
        </div>
        <div class="figure">
            <pre>$("#node-input-example3").typedInput({
    type:"msg",
    types:["msg", "flow","global"],
    typeField: "#node-input-example3-type"
})</pre>
            <p class="caption">oneditprepare</p>
         </div>
    </td>
</tr>
<tr>
    <td>
        <p class="ui-example-label">TypedInput<br>Select box</p>
        <nr-typed-input aria-label="TypedInput example: select box">
            <script type="application/json">
            {
                "type": "fruit",
                "types": [
                    {
                        "value": "fruit",
                        "options": [
                            { "value": "apple", "label": "Apple" },
                            { "value": "banana", "label": "Banana" },
                            { "value": "cherry", "label": "Cherry" }
                        ]
                    }
                ]
            }
            </script>
        </nr-typed-input>
    </td>
    <td>
        <div class="figure">
            <pre>&lt;input type="text" id="node-input-example4"&gt;</pre>
            <p class="caption">HTML</p>
        </div>
        <div class="figure">
            <pre>$("#node-input-example4").typedInput({
    types: [
        {
            value: "fruit",
            options: [
                { value: "apple", label: "Apple"},
                { value: "banana", label: "Banana"},
                { value: "cherry", label: "Cherry"},
            ]
        }
    ]
})</pre>
            <p class="caption">oneditprepare</p>
         </div>
    </td>
</tr>

<tr>
    <td>
        <p class="ui-example-label">TypedInput<br>Multiple Select box</p>
        <nr-typed-input aria-label="TypedInput example: multiple select box">
            <script type="application/json">
            {
                "type": "fruit",
                "types": [
                    {
                        "value": "fruit",
                        "multiple": true,
                        "options": [
                            { "value": "apple", "label": "Apple" },
                            { "value": "banana", "label": "Banana" },
                            { "value": "cherry", "label": "Cherry" }
                        ]
                    }
                ]
            }
            </script>
        </nr-typed-input>
    </td>
    <td>
        <div class="figure">
            <pre>&lt;input type="text" id="node-input-example5"&gt;</pre>
            <p class="caption">HTML</p>
        </div>
        <div class="figure">
            <pre>$("#node-input-example5").typedInput({
    types: [
        {
            value: "fruit",
            multiple: "true",
            options: [
                { value: "apple", label: "Apple"},
                { value: "banana", label: "Banana"},
                { value: "cherry", label: "Cherry"},
            ]
        }
    ]
})</pre>
            <p class="caption">oneditprepare</p>
         </div>
         <div>The resulting value of the multiple select is a comma-separated list of the selected options.</div>
    </td>
</tr>

</table>

<!-- The blank line above is load-bearing. A closing table tag opens a CommonMark HTML block
     that ends at the next blank line, so without it this script gets swallowed into that block
     and printed as a code listing instead of running. -->
<script>
    /* The toggle button group in the Buttons table is plain markup, not one of the editor
       widgets, so it carries its own behaviour: the handler its code sample shows. */
    const groupButtons = document.querySelectorAll('.my-button-group');
    for (const button of groupButtons) {
        button.addEventListener('click', () => {
            for (const other of groupButtons) {
                other.classList.remove('selected');
            }
            button.classList.add('selected');
        });
    }
</script>

## Multi-line Text Editor

Node-RED includes a multi-line text editor based on the [Ace code editor](https://ace.c9.io/), or
if enabled via user settings, the [Monaco editor](https://microsoft.github.io/monaco-editor/)

<div style="width: 467px" class="figure align-centre">
  <img src="/docs/creating-nodes/images/ace-editor.png" alt="Multi-line Text Editor">
  <p class="caption">Multi-line Text Editor</p>
</div>


In the following example, the node property that we will edit is called `exampleText`.

In your HTML, add a `<div>` placeholder for the editor. This must have the css class
`node-text-editor`. You will also need to set a `height` on the element.

```html
<div style="height: 250px; min-height:150px;" class="node-text-editor" id="node-input-example-editor"></div>
```

In the node's `oneditprepare` function, the text editor is initialised using the `RED.editor.createEditor`
function:

```javascript
this.editor = RED.editor.createEditor({
   id: 'node-input-example-editor',
   mode: 'ace/mode/text',
   value: this.exampleText
});
```

The `oneditsave` and `oneditcancel` functions are also needed to get the value
back from the editor when the dialog is closed, and ensure the editor is properly
removed from the page.

```javascript
oneditsave: function() {
    this.exampleText = this.editor.getValue();
    this.editor.destroy();
    delete this.editor;
},
oneditcancel: function() {
    this.editor.destroy();
    delete this.editor;
},
```



<style>
 /* Names the example in the cell beside it. These were <h5> elements, which put
    nine entries into the page's heading outline that are not sections of the
    document and cannot be navigated to: a screen reader listing headings got
    "Plain button", "Small button", "TypedInput JSON" and so on interleaved with
    the real ones. They also jumped from the h3 section heading straight to h5,
    which is the heading-order violation axe reported on this page.

    A paragraph carries the same meaning here, since the label's only job is to
    say which control is being shown. The declarations below reproduce what the
    h5 rendered at, so the page looks exactly as it did: 15px/600 in the heading
    font at the strong text colour, with the margins the old rule set. The
    line-height is stated because a paragraph would otherwise inherit prose
    spacing and set the two-line labels further apart than the h5 did. */
 table.ui-examples .ui-example-label {
     margin: 3px 0 15px;
     font-family: var(--sl-font);
     font-size: 0.9375rem;
     font-weight: 600;
     line-height: 1.2;
     color: var(--nr-black);
 }
 table.ui-examples td:first-child {
     vertical-align: top;
 }
 table.ui-examples td:last-child {
     padding-top: 35px;

 }
 /* These two tables are the widest thing on the page: the widget column plus an
    un-wrappable code column measures 2209px, while Starlight's content track is
    298px at a 390px viewport. The table had `overflow-x: hidden`, which does not
    contain a table's own overflow, so it escaped and pushed the whole document
    to 513px. Every other section on the page then scrolled sideways to
    accommodate this one table.

    `display: block` turns the table into a real scroll container. The rows and
    cells keep their table display types, so CSS wraps them in an anonymous
    table box and the two-column layout survives inside the scroller. Applied
    only below the width where the table stops fitting, so the desktop rendering
    is untouched. A wrapper <div> would be the other way to do this, but a
    closing tag followed by a blank line ends the CommonMark HTML block (see the
    note further down this file), which makes wrapping these tables in markdown
    considerably more fragile than styling them.

    The tables carry `tabindex="0"` so this scroll region is reachable by
    keyboard, which is what axe's scrollable-region-focusable rule asks for. */
 @media (max-width: 900px) {
     table.ui-examples {
         display: block;
         overflow-x: auto;
         -webkit-overflow-scrolling: touch;
     }
 }
 </style>
