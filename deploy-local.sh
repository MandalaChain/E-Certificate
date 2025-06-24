#!/bin/bash

npx hardhat node &

NODE_PID=$!

cleanup() {
  echo "Shutting down Hardhat node..."
  kill $NODE_PID
  exit
}
trap cleanup SIGINT SIGTERM

echo "Waiting Hardhat Node ready..."
while ! nc -z localhost 8545; do   
  sleep 1
done

echo "Node ready."
echo "Deploying Contract..."

# Deploy ke localhost
yarn deploy-localhost

# Setup client
yarn setup-client --network localhost

# Doctype
yarn setup-doctype --network localhost

echo "All setup. Press Ctrl+C to stop."

wait $NODE_PID
