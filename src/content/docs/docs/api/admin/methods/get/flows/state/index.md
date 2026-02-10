---
title: "GET /flows/state"
sidebar:
  order: 0
---

Get the current runtime state of flows. Note that runtime state of flows is available only if
`runtimeState` value is set to `enabled: true` in the `settings.js` file.

### Headers

Header | Value
-------|-------
`Authorization` | `Bearer [token]` - if authentication is enabled

### Response

Status Code | Reason         | Response
------------|----------------|--------------
`200`       | Success        | See example response body
`401`       | Not authorized | _none_

{% highlight json %}
{
    "state": "stop"
}
{% endhighlight %}

The response object contains the following fields:

Field          | Description
---------------|------------
`state`        | runtime state of the flows. Can be either `start` or `stop`