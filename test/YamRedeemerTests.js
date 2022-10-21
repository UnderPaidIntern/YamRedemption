const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const ONE_ETHER = 1000000000000000000;
const CHARITY_1 = "0x0000000000000000000000000000000000000001";
const CHARITY_2 = "0x0000000000000000000000000000000000000002";
const CHARITY_1_RATIO = 0.385;
const CHARITY_2_RATIO = 0.615;


describe("YamRedeemer Tests", function () {
  async function deployFixture() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;

    const [owner, user2] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");
    const yam = await Token.deploy((ONE_ETHER * 100).toString()); // 100 Yam token supply
    const token1 = await Token.deploy(ONE_ETHER.toString());
    const token2 = await Token.deploy((ONE_ETHER * 2).toString());

    const YamRedeemer = await ethers.getContractFactory("YamRedeemer");
    const yamRedeemer = await YamRedeemer.deploy(yam.address, [token1.address, token2.address], yam.balanceOf(owner.address));


    return { owner, user2, yamRedeemer, yam, token1, token2, ONE_YEAR_IN_SECS };
  }

  describe("Token transfering", function () {
    it("Yam minted to owner", async function () {
      const { yam, owner } = await loadFixture(deployFixture);

      expect(await yam.balanceOf(owner.address)).to.equal((ONE_ETHER * 100).toString());
    });

    it("Token1 minted to owner", async function () {
      const { token1, owner } = await loadFixture(deployFixture);

      expect(await token1.balanceOf(owner.address)).to.equal(ONE_ETHER.toString());
    });

    it("Token2 minted to owner", async function () {
      const { token2, owner } = await loadFixture(deployFixture);

      expect(await token2.balanceOf(owner.address)).to.equal((ONE_ETHER * 2).toString());
    });

    it("Token1 and Token2 transfered into YamRedeemer and can be redeemed", async function () {
      const { token1, token2, yam, owner, yamRedeemer } = await loadFixture(deployFixture);

      // transfer in full balance of test treasury tokens
      await token1.transfer(yamRedeemer.address, ONE_ETHER.toString());
      await token2.transfer(yamRedeemer.address, (ONE_ETHER * 2).toString());

      // redeem 10% of Yam supply
      await yam.approve(yamRedeemer.address, (ONE_ETHER * 10).toString());
      await yamRedeemer.redeem(owner.address, (ONE_ETHER * 10).toString());

      // 10 Yam less
      expect(await yam.balanceOf(owner.address)).to.equal((ONE_ETHER * 90).toString());

      // yamRedeemer should have 10 yam
      expect(await yam.balanceOf(yamRedeemer.address)).to.equal((ONE_ETHER * 10).toString());

      // have 10% less treasury tokens
      expect(await token1.balanceOf(yamRedeemer.address)).to.equal((ONE_ETHER * 0.9).toString());
      expect(await token2.balanceOf(yamRedeemer.address)).to.equal(((ONE_ETHER * 2) * 0.9).toString());

      // redeeming addres should have 10% of the treasury tokens
      expect(await token1.balanceOf(owner.address)).to.equal((ONE_ETHER * 0.1).toString());
      expect(await token2.balanceOf(owner.address)).to.equal(((ONE_ETHER * 2) * 0.1).toString());
    });

    it("2 addresses redeeming", async function () {
      const { token1, token2, yam, owner, user2, yamRedeemer } = await loadFixture(deployFixture);

      // transfer in full balance of test treasury tokens
      await token1.transfer(yamRedeemer.address, ONE_ETHER.toString());
      await token2.transfer(yamRedeemer.address, (ONE_ETHER * 2).toString());

      // give user2 yam
      await yam.transfer(user2.address, (ONE_ETHER * 5).toString());

      // redeem 5% of Yam supply
      await yam.approve(yamRedeemer.address, (ONE_ETHER * 5).toString());
      await yamRedeemer.redeem(owner.address, (ONE_ETHER * 5).toString());

      // user2 redeem 5% of Yam supply
      await yam.connect(user2).approve(yamRedeemer.address, (ONE_ETHER * 5).toString());
      await yamRedeemer.connect(user2).redeem(user2.address, (ONE_ETHER * 5).toString());

      // 5 Yam less
      expect(await yam.balanceOf(owner.address)).to.equal((ONE_ETHER * 90).toString());
      expect(await yam.balanceOf(user2.address)).to.equal("0");

      // yamRedeemer should have 10 yam
      expect(await yam.balanceOf(yamRedeemer.address)).to.equal((ONE_ETHER * 10).toString());

      // have 10% less treasury tokens
      expect(await token1.balanceOf(yamRedeemer.address)).to.equal((ONE_ETHER * 0.9).toString());
      expect(await token2.balanceOf(yamRedeemer.address)).to.equal(((ONE_ETHER * 2) * 0.9).toString());

      // redeeming address should have 5% of the treasury tokens
      expect(await token1.balanceOf(owner.address)).to.equal((ONE_ETHER * 0.05).toString());
      expect(await token2.balanceOf(owner.address)).to.equal(((ONE_ETHER * 2) * 0.05).toString());
      expect(await token1.balanceOf(user2.address)).to.equal((ONE_ETHER * 0.05).toString());
      expect(await token2.balanceOf(user2.address)).to.equal(((ONE_ETHER * 2) * 0.05).toString());
    });

    it("Charity donation works", async function () {
      const { token1, token2, yam, owner, user2, yamRedeemer, ONE_YEAR_IN_SECS } = await loadFixture(deployFixture);

      const blockAroundStart = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
      const timeAroundStart = blockAroundStart.timestamp;

      // transfer in full balance of test treasury tokens
      await token1.transfer(yamRedeemer.address, ONE_ETHER.toString());
      await token2.transfer(yamRedeemer.address, (ONE_ETHER * 2).toString());

      // give user2 yam
      await yam.transfer(user2.address, (ONE_ETHER * 5).toString());

      // redeem 90% of Yam supply
      await yam.approve(yamRedeemer.address, (ONE_ETHER * 90).toString());
      await yamRedeemer.redeem(owner.address, (ONE_ETHER * 90).toString());

      await time.increaseTo(timeAroundStart + ONE_YEAR_IN_SECS);

      await yamRedeemer.donate();

      // have 0 treasury tokens
      expect(await token1.balanceOf(yamRedeemer.address)).to.equal('0');
      expect(await token2.balanceOf(yamRedeemer.address)).to.equal('0');

      // redeeming address should have 5% of the treasury tokens
      expect(await token1.balanceOf(CHARITY_1)).to.equal((ONE_ETHER * 0.1 * CHARITY_1_RATIO).toString());
      expect(await token2.balanceOf(CHARITY_1)).to.equal((ONE_ETHER * 2 * 0.1 * CHARITY_1_RATIO).toString());
      expect(await token1.balanceOf(CHARITY_2)).to.equal((ONE_ETHER * 0.1 * CHARITY_2_RATIO).toString());
      expect(await token2.balanceOf(CHARITY_2)).to.equal((ONE_ETHER * 2 * 0.1 * CHARITY_2_RATIO).toString());
    });

    it("Charity donation reverts if too soon", async function () {
      const { token1, token2, yam, owner, user2, yamRedeemer, ONE_YEAR_IN_SECS } = await loadFixture(deployFixture);

      const blockAroundStart = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
      const timeAroundStart = blockAroundStart.timestamp;

      // transfer in full balance of test treasury tokens
      await token1.transfer(yamRedeemer.address, ONE_ETHER.toString());
      await token2.transfer(yamRedeemer.address, (ONE_ETHER * 2).toString());

      // give user2 yam
      await yam.transfer(user2.address, (ONE_ETHER * 5).toString());

      // redeem 90% of Yam supply
      await yam.approve(yamRedeemer.address, (ONE_ETHER * 90).toString());
      await yamRedeemer.redeem(owner.address, (ONE_ETHER * 90).toString());

      await time.increaseTo(timeAroundStart + ONE_YEAR_IN_SECS - 100);

      await expect(yamRedeemer.donate()).to.be.revertedWith(
        "not enough time"
      );
    });

  });

  describe("Param Validation", function () {
    it("Value check: yam address redeemedToken", async function () {
      const { yamRedeemer, yam } = await loadFixture(deployFixture);

      expect(await yamRedeemer.redeemedToken()).to.equal(yam.address);
    });

    it("Value check: charity1", async function () {
      const { yamRedeemer } = await loadFixture(deployFixture);

      expect(await yamRedeemer.charity1()).to.equal("0x0000000000000000000000000000000000000001");
    });

    it("Value check: charity2", async function () {
      const { yamRedeemer } = await loadFixture(deployFixture);

      expect(await yamRedeemer.charity2()).to.equal("0x0000000000000000000000000000000000000002");
    });

    it("Value check: oneYearInSeconds", async function () {
      const { yamRedeemer, ONE_YEAR_IN_SECS } = await loadFixture(deployFixture);

      expect(await yamRedeemer.oneYearInSeconds()).to.equal(ONE_YEAR_IN_SECS.toString());
    });

    it("Value check: charity1Ratio", async function () {
      const { yamRedeemer } = await loadFixture(deployFixture);

      expect(await yamRedeemer.charity1Ratio()).to.equal("385000000000000000");
    });

    it("Value check: charity2Ratio", async function () {
      const { yamRedeemer } = await loadFixture(deployFixture);

      expect(await yamRedeemer.charity2Ratio()).to.equal("615000000000000000");
    });
  });
});
