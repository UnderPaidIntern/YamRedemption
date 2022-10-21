// Testing contract for an ERC20
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    constructor(uint256 initialSupply) public ERC20("testToken", "TESTTK") {
        _mint(msg.sender, initialSupply);
    }
}
