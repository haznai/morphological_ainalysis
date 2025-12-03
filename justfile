# just --list
default:
   just --list

dev:
    just serve

# Build the project
build:
    deno run -A --node-modules-dir=auto npm:vite build

# Start the server with watch mode
application-start:
    deno run -A --node-modules-dir --watch ./server/main.ts

# Build and serve (equivalent to deno task serve)
serve:
    just build
    just application-start

reset-db:
   rm -rf zwicky_boxes.db

# start claude code with preferred settings
claude:
   claude --dangerously-skip-permissions 

format:
      uvx ruff format
