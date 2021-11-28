Map atlas value:

```javascript
atlasSource.split("\n").map(a => {
    let i = /\: (\d+), (\d+)/.exec(a)
    if(!i) return a
    return a.replace(/\: (\d+), (\d+)/, `: ${i[1] * 2}, ${i[2] * 2}`)
}).join("\n")
```
