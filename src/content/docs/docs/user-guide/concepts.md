---
title: "Node-RED Concepts"
sidebar:
  order: 1
---

<ul class="multi-column-toc" id="concept-toc"></ul>

---

<!-- This glossary was a kramdown definition list: a bare term line followed by `: definition`.
     Kramdown turned that into <dl>/<dt>/<dd> and read the 4-space-indented link lists as
     nested lists. Remark, Astro's markdown parser, does neither: it left the `: ` as literal
     text, and with no list parent for the indented blocks to sit under it read each of them as
     an indented code block. The page rendered nine dark code panels of raw markdown, one per
     term, with the "Working with ..." links printed as source instead of linked.
     Written out as explicit <dl>/<dt>/<dd> instead, which Astro passes through untouched.
     The blank line after each <dd>, and before each </dd>, is load-bearing: it closes the raw
     HTML block so the definition body between them is still parsed as markdown (links, inline
     code, lists) rather than emitted verbatim. Nested link lists are indented two spaces, not
     four, so nothing in this file is close enough to the four-space threshold to be read as
     code again.
     The <b id="..."> anchors matter twice over: other pages deep-link to them, and the script
     at the foot of this page builds #concept-toc by walking "dt b", so the ids and the <dt>
     wrapper both have to stay. -->
<dl>
<dt><b id="node">Node</b></dt>
<dd>

  A Node is the basic building block of a flow.

  Nodes are triggered by either receiving a message from the previous node in a
  flow, or by waiting for some external event, such as an incoming HTTP request,
  a timer or GPIO hardware change. They process that message, or event, and then
  may send a message to the next nodes in the flow.

  A node can have at most one input port and as many output ports as it requires.

  - [Working with Nodes](/docs/user-guide/editor/workspace/nodes)
  - [The Core Nodes](/docs/user-guide/nodes)
  - [Creating Nodes](/docs/creating-nodes)

</dd>
<dt><b id="config-node">Configuration node</b></dt>
<dd>

  A Configuration (config) Node is a special type of node that holds reusable
  configuration that can be shared by regular nodes in a flow.

  For example, the MQTT In and Out nodes use an MQTT Broker config node to represent a
  shared connection to an MQTT broker.

  Config nodes do not appear in the main workspace, but can be seen by opening
  the Configuration nodes sidebar.

  - [Working with Configuration nodes](/docs/user-guide/editor/workspace/nodes#configuration-nodes)
  - [Configuration node sidebar](/docs/user-guide/editor/sidebar/config)

</dd>
<dt><b id="flow">Flow</b></dt>
<dd>

  A Flow is represented as a tab within the editor workspace and is the main way to
  organise nodes.

  The term "flow" is also used to informally describe a single set of connected nodes.
  So a flow (tab) can contain multiple flows (sets of connected nodes).

  - [Working with Flows](/docs/user-guide/editor/workspace/flows)

</dd>
<dt><b id="context">Context</b></dt>
<dd>

  Context is a way to store information that can be shared between nodes without
  using the messages that pass through a flow.

  There are three types of context;

  - Node - only visible to the node that set the value
  - Flow - visible to all nodes on the same flow (or tab in the editor)
  - Global - visible to all nodes

  By default, Node-RED uses an in-memory Context store so values do not get saved
  across restarts. It can be configured to use a file-system based store to make
  the values persistent. It is also possible to plug-in alternative storage plugins.

  - [Working with context](/docs/user-guide/context)
  - [Context Store API](/docs/api/context/)

</dd>
<dt><b id="message">Message</b></dt>
<dd>

  Messages are what pass between the nodes in a flow. They are plain JavaScript
  objects that can have any set of properties. They are often referred to as `msg`
  within the editor.

  By convention, they have a `payload` property containing the most useful information.

  - [Working with messages](/docs/user-guide/messages)

</dd>
<dt><b id="subflow">Subflow</b></dt>
<dd>

  A Subflow is a collection of nodes that are collapsed into a single node in
  the workspace.

  They can be used to reduce some visual complexity of a flow, or to package up a group
  of nodes as a reusable component used in multiple places.

  - [Working with Subflows](/docs/user-guide/editor/workspace/subflows)

</dd>
<dt><b id="wire">Wire</b></dt>
<dd>

  Wires connect the nodes and represent how messages pass through the flow.

  - [Working with Wires](/docs/user-guide/editor/workspace/wires)

</dd>
<dt><b id="palette">Palette</b></dt>
<dd>

  The Palette is on the left of the editor and lists of the nodes that are available
  to use in flows.

  Extra nodes can be installed into the palette using either the command-line or
  the Palette Manager.

  - [Working with the Palette](/docs/user-guide/editor/palette/)
  - [Adding nodes to the palette](/docs/user-guide/runtime/adding-nodes)
  - [The Palette Manager](/docs/user-guide/editor/palette/manager)

</dd>
<dt><b id="workspace">Workspace</b></dt>
<dd>

  The Workspace is the main area where flows are developed by dragging nodes
  from the palette and wiring them together.

  The workspace has a row of tabs along the top; one for each flow and any
  subflows that have been opened.

  - [Working with the Workspace](/docs/user-guide/editor/workspace/)

</dd>
<dt><b id="sidebar">Sidebar</b></dt>
<dd>

  The sidebar contains panels that provide a number of useful tools within the
  editor. These include panels to view more information and help about a node,
  to view debug message and to view the flow's configuration nodes.

  - [Working with the Sidebar](/docs/user-guide/editor/sidebar/)

</dd>
</dl>

<!-- Fills the #concept-toc list at the top of the page from the glossary terms below, so the
     index cannot drift out of sync with the definitions it links to.
     This was jQuery, which worked only because the Jekyll layout loaded jQuery core globally
     from _includes/header.html for every page on the site. The Astro shell loads no jQuery,
     so the block threw "$ is not defined" and the index rendered empty. Rewritten in plain
     DOM calls rather than pulling an 87 KB library back in for five lines of work: jQuery now
     ships only on the three pages that embed live editor-widget demos.
     The term text goes in with textContent, not interpolated into an HTML string the way the
     jQuery version did, so a term can never be parsed as markup.
     The [id] in the selector is deliberate: it skips any <b> that carries no anchor rather
     than emitting a dead href="#undefined". -->
<script>
    (function () {
        function buildConceptIndex() {
            var toc = document.getElementById("concept-toc");
            if (!toc) { return; }
            document.querySelectorAll("dt b[id]").forEach(function (term) {
                var link = document.createElement("a");
                link.setAttribute("href", "#" + term.id);
                link.textContent = term.textContent;
                var item = document.createElement("li");
                item.appendChild(link);
                toc.appendChild(item);
            });
        }
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", buildConceptIndex);
        } else {
            buildConceptIndex();
        }
    })();
</script>
