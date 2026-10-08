// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract WorkEscrow {
    enum Status { Created, Funded, Submitted, Completed, Cancelled }
    struct Milestone { string title; uint256 amount; Status status; }

    address public immutable client;
    address public immutable freelancer;
    Milestone[] public milestones;

    event MilestoneAdded(uint256 indexed id, string title, uint256 amount);
    event MilestoneFunded(uint256 indexed id, uint256 amount);
    event MilestoneSubmitted(uint256 indexed id);
    event PaymentReleased(uint256 indexed id, address to, uint256 amount);
    event MilestoneCancelled(uint256 indexed id, uint256 refunded);

    modifier onlyClient() { require(msg.sender == client, "Only client"); _; }
    modifier onlyFreelancer() { require(msg.sender == freelancer, "Only freelancer"); _; }
    modifier validId(uint256 id) { require(id < milestones.length, "Invalid milestone"); _; }

    constructor(address _freelancer) {
        require(_freelancer != address(0), "Bad freelancer");
        client = msg.sender;
        freelancer = _freelancer;
    }

    function addMilestone(string calldata title, uint256 amount) external onlyClient {
        require(amount > 0, "Amount must be > 0");
        milestones.push(Milestone(title, amount, Status.Created));
        emit MilestoneAdded(milestones.length - 1, title, amount);
    }

    function fund(uint256 id) external payable onlyClient validId(id) {
        Milestone storage m = milestones[id];
        require(m.status == Status.Created, "Bad status");
        require(msg.value == m.amount, "Wrong amount");
        m.status = Status.Funded;
        emit MilestoneFunded(id, msg.value);
    }

    function submit(uint256 id) external onlyFreelancer validId(id) {
        Milestone storage m = milestones[id];
        require(m.status == Status.Funded, "Bad status");
        m.status = Status.Submitted;
        emit MilestoneSubmitted(id);
    }

    function approve(uint256 id) external onlyClient validId(id) {
        Milestone storage m = milestones[id];
        require(m.status == Status.Submitted, "Bad status");
        m.status = Status.Completed;
        (bool ok, ) = payable(freelancer).call{value: m.amount}("");
        require(ok, "Payment failed");
        emit PaymentReleased(id, freelancer, m.amount);
    }

    // client can reclaim funds only before the freelancer submits
    function cancel(uint256 id) external onlyClient validId(id) {
        Milestone storage m = milestones[id];
        require(m.status == Status.Funded, "Bad status");
        m.status = Status.Cancelled;
        (bool ok, ) = payable(client).call{value: m.amount}("");
        require(ok, "Refund failed");
        emit MilestoneCancelled(id, m.amount);
    }

    function getMilestones() external view returns (Milestone[] memory) {
        return milestones;
    }
}
