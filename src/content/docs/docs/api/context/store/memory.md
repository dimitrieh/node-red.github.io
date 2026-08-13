---
title: "Memory Context Store"
---

**New in 0.19**

The Memory Context store is the default store used by Node-RED. It holds all
context data in memory and is wiped whenever Node-RED restarts. It provides both
synchronous and asynchronous access.

## Configuration

To create a memory store, the following configuration can be used.

```javascript
contextStorage: {
   default: {
       module:"memory",
   }
}
```

## Options

The memory store does not provide any configuration options.
