# just --list
default:
   just --list

# local ai model server
start-model-server:
	./run_nemotron.py

# frontend Development server
[working-directory: 'frontend']
dev:
    just serve

# Build the project
[working-directory: 'frontend']
build:
    deno run -A --node-modules-dir=auto npm:vite build

# Start the server with watch mode
[working-directory: 'frontend']
application-start:
    deno run -A --node-modules-dir --watch ./server/main.ts

# Build and serve (equivalent to deno task serve)
[working-directory: 'frontend']
serve:
    just build
    just application-start

[working-directory: 'frontend']
reset-db:
   rm -rf zwicky_boxes.db

# start claude code with preferred settings
claude:
   claude --dangerously-skip-permissions --model="sonnet"
