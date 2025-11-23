import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

// Mock sBTC contract address (adjust if different in your Clarinet.toml)
const SBTC_CONTRACT = "ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token";

describe("Credora Protocol - Unit Tests", () => {
  
  // Advance blocks before all tests to prevent ArithmeticUnderflow
  // The contract's get-average-balance function needs at least 61 days of history
  // 61 days * 144 blocks/day = 8784 blocks minimum
  beforeEach(() => {
    // Mine 10000 blocks (~69 days) to ensure enough history for credit scoring
    const currentHeight = simnet.blockHeight;
    if (currentHeight < 10000) {
      simnet.mineEmptyBlocks(10000 - currentHeight);
    }
  });
  
  describe("Initialization and Setup", () => {
    it("ensures simnet is properly initialized", () => {
      expect(simnet.blockHeight).toBeDefined();
      expect(simnet.blockHeight).toBeGreaterThan(0);
    });

    it("verifies contract is deployed", () => {
      const contractSource = simnet.getContractSource("credora");
      expect(contractSource).toBeDefined();
    });

    it("checks initial admin is deployer", () => {
      const admin = simnet.getDataVar("credora", "admin");
      expect(admin).toBePrincipal(deployer);
    });

    it("verifies initial lending pool is empty", () => {
      const totalPool = simnet.getDataVar("credora", "total_lending_pool");
      expect(totalPool).toBeUint(0);
    });

    it("checks default interest rate is 15%", () => {
      const interestRate = simnet.getDataVar("credora", "interest_rate_in_percent");
      expect(interestRate).toBeUint(15);
    });

    it("checks default loan duration is 14 days", () => {
      const loanDuration = simnet.getDataVar("credora", "loan_duration_in_days");
      expect(loanDuration).toBeUint(14);
    });

    it("checks default lock duration is 0 days", () => {
      const lockDuration = simnet.getDataVar("credora", "lock_duration_in_days");
      expect(lockDuration).toBeUint(0);
    });
  });

  describe("Admin Functions", () => {
    it("allows admin to change interest rate", () => {
      const newRate = 20;
      const setRate = simnet.callPublicFn(
        "credora",
        "set-interest-rate-in-percent",
        [Cl.uint(newRate)],
        deployer
      );
      expect(setRate.result).toBeOk(Cl.bool(true));
      
      const interestRate = simnet.getDataVar("credora", "interest_rate_in_percent");
      expect(interestRate).toBeUint(newRate);
    });

    it("prevents non-admin from changing interest rate", () => {
      const setRate = simnet.callPublicFn(
        "credora",
        "set-interest-rate-in-percent",
        [Cl.uint(25)],
        wallet1
      );
      expect(setRate.result).toBeErr(Cl.uint(100)); // err_not_admin
    });

    it("allows admin to change loan duration", () => {
      const newDuration = 30;
      const setDuration = simnet.callPublicFn(
        "credora",
        "set-loan-duration-in-days",
        [Cl.uint(newDuration)],
        deployer
      );
      expect(setDuration.result).toBeOk(Cl.bool(true));
      
      const loanDuration = simnet.getDataVar("credora", "loan_duration_in_days");
      expect(loanDuration).toBeUint(newDuration);
    });

    it("prevents setting loan duration below minimum (7 days)", () => {
      const setDuration = simnet.callPublicFn(
        "credora",
        "set-loan-duration-in-days",
        [Cl.uint(5)],
        deployer
      );
      expect(setDuration.result).toBeErr(Cl.uint(101)); // err_input_value_too_small
    });