# morphological_ainalysis

Combining morphological analysis (Zwicky box) with AI reasoning models to generate new dimensions and discover high-potential combinations for a defined problem (or outcome we want to achieve)

## usage

assumes you have `just` and  `deno` installed. 
`just` is really not needed, only if you want to use the commands in the `justfile`.
anyways, if [`deno` is installed](https://docs.deno.com/runtime/getting_started/installation/), you can build and start the application with:
```
deno run -A --node-modules-dir=auto npm:vite build && deno run -A --node-modules-dir --watch ./server/main.ts
```

you can reset the database like: 
```
rm -rf zwicky_boxes.db
```





