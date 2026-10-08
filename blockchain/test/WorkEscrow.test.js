const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("WorkEscrow", () => {
  let client, freelancer, other, escrow;
  const amount = ethers.parseEther("0.5");

  beforeEach(async () => {
    [client, freelancer, other] = await ethers.getSigners();
    const F = await ethers.getContractFactory("WorkEscrow");
    escrow = await F.deploy(freelancer.address);
    await escrow.waitForDeployment();
    await escrow.addMilestone("Design", amount);
  });

  it("full flow pays the freelancer", async () => {
    await escrow.fund(0, { value: amount });
    await escrow.connect(freelancer).submit(0);
    const before = await ethers.provider.getBalance(freelancer.address);
    await expect(escrow.approve(0)).to.emit(escrow, "PaymentReleased");
    const after = await ethers.provider.getBalance(freelancer.address);
    expect(after - before).to.equal(amount);
  });

  it("rejects the wrong funding amount", async () => {
    await expect(escrow.fund(0, { value: 1 })).to.be.revertedWith("Wrong amount");
  });

  it("only the client can fund", async () => {
    await expect(escrow.connect(other).fund(0, { value: amount })).to.be.revertedWith("Only client");
  });

  it("freelancer cannot submit an unfunded milestone", async () => {
    await expect(escrow.connect(freelancer).submit(0)).to.be.revertedWith("Bad status");
  });

  it("client cannot approve before submission", async () => {
    await escrow.fund(0, { value: amount });
    await expect(escrow.approve(0)).to.be.revertedWith("Bad status");
  });

  it("client can cancel a funded milestone and is refunded", async () => {
    await escrow.fund(0, { value: amount });
    await escrow.cancel(0);
    expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(0n);
  });

  it("cannot cancel after the freelancer submitted", async () => {
    await escrow.fund(0, { value: amount });
    await escrow.connect(freelancer).submit(0);
    await expect(escrow.cancel(0)).to.be.revertedWith("Bad status");
  });

  it("rejects an invalid milestone id", async () => {
    await expect(escrow.fund(5, { value: amount })).to.be.revertedWith("Invalid milestone");
  });
});
