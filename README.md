# WorkChain

A cloud-based freelance platform where agreements and milestone payments are
managed by an escrow smart contract, and every transaction is recorded on the blockchain.

## Stack
- Frontend: Next.js (React), ethers.js, MetaMask
- Backend: Node.js, Express, MongoDB, JWT
- Blockchain: Solidity, Hardhat (local network, chain ID 31337)

## How it works
1. A client posts a project with milestones (amounts in ETH).
2. Freelancers submit proposals; the client accepts one and the freelancer confirms.
3. The client deploys an escrow contract for the project and funds each milestone.
4. The freelancer submits work; the client approves and the contract releases payment.
5. Transaction hashes are stored per milestone and listed on the Transactions page.

## Run locally
Requirements: Node 18+, Docker, MetaMask.

```bash
# MongoDB
docker run -d --name workchain-mongo -p 27017:27017 mongo:7

# Terminal 1: local blockchain
cd blockchain && npm install && npx hardhat node

# Terminal 2: backend
cd backend && npm install && cp .env.example .env   # then set JWT_SECRET
npm run dev

# Terminal 3: frontend
cd frontend && npm install && npm run dev
```

Open http://localhost:3000.

MetaMask: add the network Hardhat Local (RPC http://127.0.0.1:8545, chain ID 31337, ETH)
and import two accounts from the private keys printed by `npx hardhat node`
(one as client, one as freelancer). The freelancer must click "Save wallet"
while on the freelancer account before the client creates the contract.

## Tests
```bash
cd blockchain && npx hardhat test    # contract tests
cd backend && node test.js           # API tests (server must be running)
```

## Contract changes
After editing `blockchain/contracts/WorkEscrow.sol`:
```bash
cd blockchain && npx hardhat compile
cp artifacts/contracts/WorkEscrow.sol/WorkEscrow.json ../frontend/lib/
```
