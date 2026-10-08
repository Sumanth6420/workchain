import { BrowserProvider, Contract, ContractFactory, parseEther } from "ethers";
import escrow from "./WorkEscrow.json";

const HARDHAT_CHAIN_ID = 31337n;
const short = (a) => `${a.slice(0, 6)}...${a.slice(-4)}`;

export function explain(error) {
  if (error?.code === "ACTION_REJECTED") return "You rejected the transaction in MetaMask.";
  return error?.shortMessage || error?.reason || error?.message || "Something went wrong.";
}

async function ensureHardhatNetwork() {
  const current = await new BrowserProvider(window.ethereum).getNetwork();
  if (current.chainId === HARDHAT_CHAIN_ID) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x7a69" }],
    });
  } catch (error) {
    if (error.code === 4902 || error.code === -32603) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x7a69",
          chainName: "Hardhat Local",
          rpcUrls: ["http://127.0.0.1:8545"],
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        }],
      });
    } else {
      throw new Error("Switch MetaMask to the Hardhat Local network (chain 31337).");
    }
  }

  const after = await new BrowserProvider(window.ethereum).getNetwork();
  if (after.chainId !== HARDHAT_CHAIN_ID)
    throw new Error("Switch MetaMask to the Hardhat Local network (chain 31337).");
}

export async function getSigner() {
  if (!window.ethereum) throw new Error("MetaMask is not installed.");
  await window.ethereum.request({ method: "eth_requestAccounts" });
  await ensureHardhatNetwork();
  const provider = new BrowserProvider(window.ethereum);
  return provider.getSigner();
}

export async function deployContract(freelancerWallet, milestones, onStatus = () => {}) {
  const signer = await getSigner();
  onStatus("Confirm the contract deployment in MetaMask...");
  const factory = new ContractFactory(escrow.abi, escrow.bytecode, signer);
  const contract = await factory.deploy(freelancerWallet);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const txHash = contract.deploymentTransaction().hash;

  for (let i = 0; i < milestones.length; i++) {
    const m = milestones[i];
    onStatus(`Confirm milestone ${i + 1} of ${milestones.length} in MetaMask...`);
    const tx = await contract.addMilestone(m.title, parseEther(String(m.amount)));
    await tx.wait();
  }
  return { address, txHash };
}

export async function milestoneAction(address, action, index, amountEth) {
  const signer = await getSigner();
  const contract = new Contract(address, escrow.abi, signer);
  const me = (await signer.getAddress()).toLowerCase();

  let expected;
  try {
    expected = action === "submit" ? await contract.freelancer() : await contract.client();
  } catch {
    throw new Error(
      "Contract not found on this chain. If you restarted the Hardhat node, create a new project."
    );
  }
  if (expected.toLowerCase() !== me) {
    const who = action === "submit" ? "freelancer" : "client";
    throw new Error(`Switch MetaMask to the ${who} account (${short(expected)}).`);
  }

  let tx;
  if (action === "fund") tx = await contract.fund(index, { value: parseEther(String(amountEth)) });
  else if (action === "submit") tx = await contract.submit(index);
  else tx = await contract.approve(index);
  await tx.wait();
  return tx.hash;
}
