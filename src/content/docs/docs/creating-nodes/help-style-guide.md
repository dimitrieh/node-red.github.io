---
title: "Node help style guide"
sidebar:
  order: 12
---

When a node is selected, its help text is displayed in the info tab. This help
should provide the user with all the information they need in order to use the node.

The following style guide describes how the help should be structured to ensure
a consistent appearance between nodes.

*Since 2.1.0* : The help text can be provided as markdown rather than HTML. In this
case the `type` attribute of the `<script>` tag must be `text/markdown`.<br>
When creating markdown help text be careful with indentation, markdown is whitespace sensitive so all lines should have no leading whitespace inside the `<script>` tags.

<hr/>

<!-- The .node-help panels below are styled from starlight-custom.css. This used
     to link /css/node-help.css, which the migration dropped along with the rest
     of the Jekyll css/ tree, so the link 404'd and the panels lost the editor's
     help typography entirely. -->

<div class="grid" style="min-height:auto; padding:5px 0 5px; border-bottom: 1px solid var(--nr-border);">
    <div class="col-1-2">
        This section provides a high-level introduction to the node. It should be
        no more than 2 or 3 lines long. The first line (<code>&lt;p&gt;</code>)
        is used as the tooltip when hovering over the node in the palette.
    </div>
    <div class="col-1-2 node-help nr-light-panel" style="padding-right: 5px;">
        <p>Connects to a MQTT broker and publishes messages.</p>
    </div>
</div>
<div class="grid" style="min-height:auto; padding:5px 0 5px; border-bottom: 1px solid var(--nr-border);">
    <div class="col-1-2">
        If the node has an input, this section describes the properties of the
        message the node will use. The expected type of each property can also
        be provided. The description should be brief - if further description is
        needed, it should be in the Details section.
    </div>
    <div class="col-1-2 node-help nr-light-panel" style="padding-right: 5px;">
        <h3>Inputs</h3>
           <dl class="message-properties">
              <dt>payload
                  <span class="property-type">string | buffer</span>
              </dt>
              <dd> the payload of the message to publish. </dd>
              <dt class="optional">topic <span class="property-type">string</span></dt>
              <dd> the MQTT topic to publish to.</dd>
         </dl>
     </div>
 </div>
 <div class="grid" style="min-height:auto; padding:5px 0 5px; border-bottom: 1px solid var(--nr-border);">
     <div class="col-1-2">
         If the node has outputs, as with the Inputs section, this section
         describes the properties of the messages the node will send. If the node
         has multiple outputs, a separate property list can be provided for each.
     </div>
     <div class="col-1-2 node-help nr-light-panel" style="padding-right: 5px;">
         <h3>Outputs</h3>
             <ol class="node-ports">
                 <li>Standard output
                     <dl class="message-properties">
                         <dt>payload <span class="property-type">string</span></dt>
                         <dd>the standard output of the command.</dd>
                     </dl>
                 </li>
                 <li>Standard error
                     <dl class="message-properties">
                         <dt>payload <span class="property-type">string</span></dt>
                         <dd>the standard error of the command.</dd>
                     </dl>
                 </li>
             </ol>
      </div>
  </div>
 <div class="grid" style="min-height:auto; padding:5px 0 5px; border-bottom: 1px solid var(--nr-border);">
     <div class="col-1-2">
        <p>This section provides more detailed information about the node. It should
        explain how it should be used, providing more information on its inputs/outputs.</p>
        <p></p>
     </div>
     <div class="col-1-2 node-help nr-light-panel" style="padding-right: 5px;">
        <h3>Details</h3>
         <p><code>msg.payload</code> is used as the payload of the published message.
        If it contains an Object it will be converted to a JSON string before being sent.
        If it contains a binary Buffer the message will be published as-is.</p>
         <p>The topic used can be configured in the node or, if left blank, can be set by <code>msg.topic</code>.</p>
         <p>Likewise the QoS and retain values can be configured in the node or, if left
        blank, set by <code>msg.qos</code> and <code>msg.retain</code> respectively.</p>
    </div>
</div>
<div class="grid" style="min-height:auto; padding:5px 0 5px;">
    <div class="col-1-2">
       <p>This section can be used to provide links to external resources, such as:</p>
       <ul>
          <li>any relevant additional documentation. Such as how the Template node links
          to the Mustache language guide.</li>
          <li>the node's git repository or npm page - where the user can get additional help</li>
       </ul>

    </div>
    <div class="col-1-2 node-help nr-light-panel" style="padding-right: 5px;">
       <h3>References</h3>
        <ul>
            <li><a>Twitter API docs</a> - full description of <code>msg.tweet</code> property</li>
            <li><a>GitHub</a> - the node's github repository</li>
        </ul>
   </div>
</div>


<hr/>

The above example was created with the following:.

<div class="code-tab-html">

```html
<script type="text/html" data-help-name="node-type">
<p>Connects to a MQTT broker and publishes messages.</p>

<h3>Inputs</h3>
    <dl class="message-properties">
        <dt>payload
            <span class="property-type">string | buffer</span>
        </dt>
        <dd> the payload of the message to publish. </dd>
        <dt class="optional">topic <span class="property-type">string</span></dt>
        <dd> the MQTT topic to publish to.</dd>
    </dl>

 <h3>Outputs</h3>
     <ol class="node-ports">
         <li>Standard output
             <dl class="message-properties">
                 <dt>payload <span class="property-type">string</span></dt>
                 <dd>the standard output of the command.</dd>
             </dl>
         </li>
         <li>Standard error
             <dl class="message-properties">
                 <dt>payload <span class="property-type">string</span></dt>
                 <dd>the standard error of the command.</dd>
             </dl>
         </li>
     </ol>

<h3>Details</h3>
    <p><code>msg.payload</code> is used as the payload of the published message.
    If it contains an Object it will be converted to a JSON string before being sent.
    If it contains a binary Buffer the message will be published as-is.</p>
    <p>The topic used can be configured in the node or, if left blank, can be set
    by <code>msg.topic</code>.</p>
    <p>Likewise the QoS and retain values can be configured in the node or, if left
    blank, set by <code>msg.qos</code> and <code>msg.retain</code> respectively.</p>

<h3>References</h3>
    <ul>
        <li><a>Twitter API docs</a> - full description of <code>msg.tweet</code> property</li>
        <li><a>GitHub</a> - the nodes github repository</li>
    </ul>
</script>
```

</div>
<div class="code-tab-md">

```markdown
<script type="text/markdown" data-help-name="node-type">
Connects to a MQTT broker and publishes messages.

### Inputs

: payload (string | buffer) :  the payload of the message to publish.
: *topic* (string)          :  the MQTT topic to publish to.


### Outputs

1. Standard output
: payload (string) : the standard output of the command.

2. Standard error
: payload (string) : the standard error of the command.

### Details

`msg.payload` is used as the payload of the published message.
If it contains an Object it will be converted to a JSON string before being sent.
If it contains a binary Buffer the message will be published as-is.

The topic used can be configured in the node or, if left blank, can be set
`msg.topic`.

Likewise the QoS and retain values can be configured in the node or, if left
blank, set by `msg.qos` and `msg.retain` respectively.

### References

 - [Twitter API docs]() - full description of `msg.tweet` property
 - [GitHub]() - the nodes github repository
</script>
```

</div>

## Section headers

Each section must be marked up with an `<h3>` tag. If the `Details` section needs
sub headings, they must use `<h4>` tags.

<div class="code-tab-html">

```html
<h3>Inputs</h3>
...
<h3>Details</h3>
...
 <h4>A sub section</h4>
 ...
```

</div>
<div class="code-tab-md">

```markdown
### Inputs
...
### Details
...
#### A sub section
...
```

</div>

## Message properties

A list of message properties is marked up with a `<dl>` list. The list must have
a class attribute of `message-properties`.

Each item in the list consists of a pair of `<dt>` and `<dd>` tags.

Each `<dt>` contains the property name and an optional `<span class="property-type">`
that contains the expected type of the property. If the property is optional,
the `<dt>` should have a class attribute of `optional`.

Each `<dd>` contains a brief description of the property.

<div class="code-tab-html">

```html
<dl class="message-properties">
    <dt>payload
        <span class="property-type">string | buffer</span>
    </dt>
    <dd> the payload of the message to publish. </dd>
    <dt class="optional">topic
        <span class="property-type">string</span>
    </dt>
    <dd> the MQTT topic to publish to.</dd>
</dl>
```

</div>
<div class="code-tab-md">

```markdown
: payload (string | buffer) :  the payload of the message to publish.
: *topic* (string)          :  the MQTT topic to publish to.
```

</div>

## Multiple outputs

If the node has multiple outputs, each output should have its own message property
list, as described above. Those lists should be wrapped in a `<ol>` list with a
class attribute of `node-ports`

Each item in the list should consist of a brief description of the output followed
by a `<dl>` message property list.

<b>Note</b>: if the node has a single output, it should not be wrapped in such a list and
just the `<dl>` used.

<div class="code-tab-html">

```html
<ol class="node-ports">
    <li>Standard output
        <dl class="message-properties">
            <dt>payload <span class="property-type">string</span></dt>
            <dd>the standard output of the command.</dd>
        </dl>
    </li>
    <li>Standard error
        <dl class="message-properties">
            <dt>payload <span class="property-type">string</span></dt>
            <dd>the standard error of the command.</dd>
        </dl>
    </li>
</ol>
```

</div>
<div class="code-tab-md">

```markdown
1. Standard output
: payload (string) : the standard output of the command.

2. Standard error
: payload (string) : the standard error of the command.
```

</div>

## General guidance

When referencing a message property outside of a message property list described
above, they should be prefixed with `msg.` to make it clear to the reader what
it is. They should be wrapped in `<code>` tags.

<div class="code-tab-html">

```html
The interesting part is in <code>msg.payload</code>.
```

</div>
<div class="code-tab-md">

```markdown
The interesting part is in `msg.payload`.
```

</div>

No other styling markup (e.g. `<b>`,`<i>`) should be used within the body of the help text.

The help should not assume the reader is an experienced developer or deeply familiar
with whatever the node exposes; above all, it needs to be helpful.

<style>

/* These two carry light fills, so they also have to carry their own text colour:
   inheriting it put near-white text on #bbb and on white in dark mode. */
.format-button {
    padding: 2px 8px;
    border: 1px solid #666;
    margin-right: 8px;
    background: #bbb;
    color: #2d2d2d;
}
.format-button.active {
    background: white;
    color: #2d2d2d;
    pointer-events: none;

}
.code-example-switcher pre {
    margin-top: 0;
}
</style>

<!-- Pairs each .code-tab-html block with the .code-tab-md block that follows it and puts an
     HTML / Markdown toggle above the pair, so the same help text can be shown in either
     form without printing both.
     This was jQuery, which worked only because the Jekyll layout loaded jQuery core globally
     from _includes/header.html for every page on the site. The Astro shell loads no jQuery,
     so the block threw "$ is not defined" and neither tab appeared. Rewritten in plain DOM
     calls rather than pulling an 87 KB library back in for one toggle: jQuery now ships only
     on the three pages that embed live editor-widget demos.
     Behaviour, class names and the resulting DOM shape are unchanged from the jQuery version:
     div.code-example-switcher > [toolbar div, container div > [html block, md block]], HTML
     active on load, Markdown hidden. Buttons are built with createElement/textContent, never
     from an HTML string.
     The classes come from the wrapper divs around each fence above. Jekyll set them with
     kramdown inline attribute lists, which remark does not implement, so those markers used
     to render as literal text and nothing carried either class. Keep the divs adjacent with
     no prose between them: this reads the md block off the html block's nextElementSibling.
     A pair that loses its partner is skipped, leaving both code blocks readable. -->
<script>
(function () {
    function buildCodeTabs() {
        document.querySelectorAll(".code-tab-html").forEach(function (htmlBlock) {
            var mdBlock = htmlBlock.nextElementSibling;
            if (!mdBlock || !mdBlock.classList.contains("code-tab-md")) { return; }
            mdBlock.style.display = "none";

            var switcher = document.createElement("div");
            switcher.className = "code-example-switcher";
            htmlBlock.parentNode.insertBefore(switcher, htmlBlock);

            var toolbar = document.createElement("div");
            switcher.appendChild(toolbar);

            var container = document.createElement("div");
            switcher.appendChild(container);
            container.appendChild(htmlBlock);
            container.appendChild(mdBlock);

            var htmlButton = document.createElement("a");
            htmlButton.setAttribute("href", "#");
            htmlButton.className = "active format-button";
            htmlButton.textContent = "HTML";

            var mdButton = document.createElement("a");
            mdButton.setAttribute("href", "#");
            mdButton.className = "format-button";
            mdButton.textContent = "Markdown";

            toolbar.appendChild(htmlButton);
            toolbar.appendChild(mdButton);

            htmlButton.addEventListener("click", function (evt) {
                evt.preventDefault();
                mdBlock.style.display = "none";
                htmlBlock.style.display = "";
                htmlButton.classList.add("active");
                mdButton.classList.remove("active");
            });
            mdButton.addEventListener("click", function (evt) {
                evt.preventDefault();
                mdBlock.style.display = "";
                htmlBlock.style.display = "none";
                htmlButton.classList.remove("active");
                mdButton.classList.add("active");
            });
        });
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", buildCodeTabs);
    } else {
        buildCodeTabs();
    }
})();
</script>
