;; Title: Credora Protocol
;; Summary: Trust-scored Bitcoin lending on Stacks
;; Description: Credora enables permissionless sBTC lending with algorithmic credit scoring.
;;              Lenders earn yield, borrowers access instant liquidity without collateral based on on-chain reputation.

;; CONSTANTS - Error Codes
;; These error codes are returned when operations fail

(define-constant err_not_admin (err u100)) ;; Caller is not the contract admin
(define-constant err_input_value_too_small (err u101)) ;; Input value doesn't meet minimum requirements
(define-constant err_not_a_lender (err u102)) ;; Address has no funds in the lending pool
(define-constant err_pool_share_exceeded (err u103)) ;; Withdrawal amount exceeds lender's pool share
(define-constant err_not_eligible (err u104)) ;; Borrower doesn't meet credit requirements
(define-constant err_funds_not_available_now (err u105)) ;; Insufficient liquidity in the pool
(define-constant err_funds_locked (err u106)) ;; Funds are still in lock-up period
(define-constant err_unable_to_get_block (err u107)) ;; Failed to retrieve historical block data

;; CONSTANTS - Credit Tier Limits
;; Maximum borrowing amounts in satoshis for each credit tier
;; Tiers are determined by credit score thresholds

(define-constant tier_0_limit u10000)     ;; Entry level: 0.0001 BTC
(define-constant tier_1_limit u50000)     ;; Bronze: 0.0005 BTC
(define-constant tier_2_limit u100000)    ;; Silver: 0.001 BTC
(define-constant tier_3_limit u300000)    ;; Gold: 0.003 BTC
(define-constant tier_4_limit u500000)    ;; Platinum: 0.005 BTC
(define-constant tier_5_limit u1000000)   ;; Diamond: 0.01 BTC

;; DATA STORAGE
;; Maps to store user data and loan information

;; Stores lending pool deposit information for each lender
;; Key: lender's principal address
;; Value: balance (deposited amount), locked_block (deposit time), unlock_block (when funds can be withdrawn)
(define-map lender_info
  principal
  {
    balance: uint,        ;; Amount deposited by lender (in satoshis)
    locked_block: uint,   ;; Block height when deposit was made
    unlock_block: uint,   ;; Block height when funds become withdrawable
  }
)

;; Tracks currently active loans for each borrower
;; Key: borrower's principal address
;; Value: loan details including amount, due date, interest rate, and issue date
(define-map active_loans
  principal
  {
    amount: uint,         ;; Loan principal in satoshis
    due_block: uint,      ;; Block height when repayment is due
    interest_rate: uint,  ;; Interest rate as percentage (e.g., 15 = 15%)
    issued_block: uint,   ;; Block height when loan was issued
  }
)

;; Stores credit history metrics for each borrower
;; Used to calculate credit scores for loan eligibility
;; Key: borrower's principal address
;; Value: lifetime loan statistics
(define-map account_data_map
  principal
  {
    total_loans: uint,     ;; Total number of loans taken (including active)
    on_time_loans: uint,   ;; Number of loans repaid on time
    late_loans: uint,      ;; Number of loans repaid late
  }
)

;; Contract admin address (initially set to deployer)
(define-data-var admin principal tx-sender)

;; Total amount deposited in the lending pool (in satoshis)
;; Used to calculate each lender's proportional share of interest earnings
(define-data-var total_lending_pool uint u0)

;; Annual interest rate charged on loans (default 15%)
;; Applied when calculating loan repayment amounts
(define-data-var interest_rate_in_percent uint u15)

;; Default loan duration in days (default 14 days / 2 weeks)
;; Determines repayment deadline for new loans
(define-data-var loan_duration_in_days uint u14)

;; Lock-up period for lender deposits in days (default 0 = no lock)
;; Lenders cannot withdraw until unlock_block is reached
(define-data-var lock_duration_in_days uint u0)

;; PRIVATE HELPER FUNCTIONS
;; Internal utility functions used by public functions

;; Verifies that the caller is the contract admin
;; Returns: true if caller is admin, false otherwise
(define-private (is-admin)
  (begin
    (asserts! (is-eq contract-caller (var-get admin)) false)
    true
  )
)

;; Returns the average time per block in seconds (600 seconds = 10 minutes)
;; Used for converting between days and block heights
(define-read-only (time-per-block)
  (* u10 u60)
)

;; Converts a duration in days to equivalent number of blocks
;; Params: days - number of days to convert
;; Returns: approximate number of blocks in that time period
(define-private (convert-days-to-blocks (days uint))
  (/ (* days u24 u60 u60) (time-per-block))
)

;; Calculates 3-month average sBTC balance across historical snapshots
;; Samples balance at three points: 1 day, 31 days, and 61 days ago
;; Used as a key factor in credit scoring algorithm
;; Params: who - principal address to check
;; Returns: average sBTC balance in satoshis (returns 0 on error)
(define-private (get-average-balance (who principal))
  (let (
      ;; Get block hash from ~1 day ago
      (stacks_stacks_id_header_hash_1 (unwrap!
        (get-stacks-block-info? id-header-hash
          (- stacks-block-height (convert-days-to-blocks u1))
        )
        u0
      ))
      ;; Get block hash from ~31 days ago (1 month)
      (stacks_stacks_id_header_hash_2 (unwrap!
        (get-stacks-block-info? id-header-hash
          (- stacks-block-height (convert-days-to-blocks u31))
        )
        u0
      ))
      ;; Get block hash from ~61 days ago (2 months)
      (stacks_stacks_id_header_hash_3 (unwrap!
        (get-stacks-block-info? id-header-hash
          (- stacks-block-height (convert-days-to-blocks u61))
        )
        u0
      ))
    )
    ;; Calculate average by summing three historical balances and dividing by 3
    (/
      (+
        ;; Balance at 1 day ago
        (at-block stacks_stacks_id_header_hash_1
          (unwrap!
            (contract-call? 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token
              get-balance who
            )
            u0
          ))
        ;; Balance at 31 days ago
        (at-block stacks_stacks_id_header_hash_2
          (unwrap!
            (contract-call? 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token
              get-balance who
            )
            u0
          ))
        ;; Balance at 61 days ago
        (at-block stacks_stacks_id_header_hash_3
          (unwrap!
            (contract-call? 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token
              get-balance who
            )
            u0
          ))
      )
      u3  ;; Divide by 3 for average
    )
  )
)

;; Maps credit score to borrowing tier
;; Uses cascading checks to determine maximum loan amount based on credit score
;; Credit Score Ranges:
;;   0-300: tier_0 (entry level)
;;   301-450: tier_1 (bronze)
;;   451-600: tier_2 (silver)
;;   601-750: tier_3 (gold)
;;   751-900: tier_4 (platinum)
;;   901+: tier_5 (diamond)
;; Params: credit_score - borrower's calculated credit score (0-1000)
;; Returns: maximum loan amount in satoshis for that score
(define-private (loan-limit (credit_score uint))
  (begin
    (asserts! (> credit_score u300) tier_0_limit)
    (asserts! (> credit_score u450) tier_1_limit)
    (asserts! (> credit_score u600) tier_2_limit)
    (asserts! (> credit_score u750) tier_3_limit)
    (asserts! (> credit_score u900) tier_4_limit)
    tier_5_limit
  )
)

;; Scores on-chain activity based on average sBTC balance (0-300 pts)
;; Higher balances indicate more skin in the game and lower default risk
;; This component accounts for 30% of the total credit score
;; Params: average_balance - 3-month average sBTC balance in satoshis
;; Returns: activity score ranging from 0 to 300 points
(define-private (activity-score (average_balance uint))
  (begin
    (asserts! (> average_balance u0) u0)               ;; 0 points: no balance
    (asserts! (>= average_balance tier_0_limit) u100)  ;; 100 points: >= 0.0001 BTC
    (asserts! (>= average_balance tier_1_limit) u220)  ;; 220 points: >= 0.0005 BTC
    (asserts! (>= average_balance tier_2_limit) u240)  ;; 240 points: >= 0.001 BTC
    (asserts! (>= average_balance tier_3_limit) u260)  ;; 260 points: >= 0.003 BTC
    (asserts! (>= average_balance tier_4_limit) u280)  ;; 280 points: >= 0.005 BTC
    u300                                               ;; 300 points: >= 0.01 BTC
  )
)

;; Scores repayment history based on loan performance (0-700 pts)
;; This component accounts for 70% of the total credit score
;; New borrowers get a boost by dividing by (total_loans + 5) for first few loans
;; Params: 
;;   total_loans - total number of loans taken
;;   on_time_loans - number of loans repaid on or before due date
;;   late_loans - number of loans repaid after due date
;; Returns: repayment score ranging from 0 to 700 points
(define-private (repayment-score
    (total_loans uint)
    (on_time_loans uint)
    (late_loans uint)
  )
  (if (> on_time_loans u0)
    (if (< total_loans u5)
      ;; For new borrowers (< 5 loans): soften the impact of limited history
      (/ (* on_time_loans u700) (+ total_loans u5))
      ;; For established borrowers: standard on-time percentage calculation
      (/ (* on_time_loans u700) total_loans)
    )
    u0  ;; No on-time loans = 0 points
  )
)

;; Updates borrower stats and marks loan as paid
;; Determines if payment was on-time or late, updates credit history accordingly
;; Also removes the active loan record after successful repayment
;; Params: who - principal address of borrower making payment
;; Returns: updates account_data_map and deletes from active_loans
(define-private (check-for-late-payment-and-update-data-after-payment (who principal))
  (let (
      ;; Get borrower's historical loan data
      (account_data (default-to {
        total_loans: u0,
        on_time_loans: u0,
        late_loans: u0,
      }
        (map-get? account_data_map who)
      ))
      ;; Get the due date for current loan
      (due_block (default-to u0 (get due_block (map-get? active_loans who))))
    )
    ;; Check if payment is on-time (current block <= due block)
    (if (<= stacks-block-height due_block)
      ;; On-time payment: increment on_time_loans counter
      (map-set account_data_map who {
        total_loans: (get total_loans account_data),
        on_time_loans: (+ (get on_time_loans account_data) u1),
        late_loans: (get late_loans account_data),
      })
      ;; Late payment: increment late_loans counter
      (map-set account_data_map who {
        total_loans: (get total_loans account_data),
        on_time_loans: (get on_time_loans account_data),
        late_loans: (+ (get late_loans account_data) u1),
      })
    )
    ;; Remove loan from active loans map after payment processed
    (map-delete active_loans who)
  )
)

;; Validates borrower eligibility via credit scoring algorithm
;; Combines activity score (30%) and repayment score (70%) to determine credit limit
;; Ensures borrower has no outstanding loan and meets minimum credit requirements
;; Params:
;;   who - principal address of loan applicant
;;   account_data - borrower's credit history record
;;   amount - requested loan amount in satoshis
;; Returns: true if eligible, false otherwise
(define-private (loan-eligibility
    (who principal)
    (account_data {
      total_loans: uint,
      on_time_loans: uint,
      late_loans: uint,
    })
    (amount uint)
  )
  (let (
      (total_loans (get total_loans account_data))
      (on_time_loans (get on_time_loans account_data))
      (late_loans (get late_loans account_data))
      (average_balance (get-average-balance who))
    )
    ;; Handle first-time borrowers differently (total_loans = 0)
    (if (is-eq total_loans u0)
      (begin
        ;; Verify loan history is consistent (no outstanding loans)
        (asserts! (is-eq (+ late_loans on_time_loans) total_loans) false)
        ;; Ensure average balance covers requested amount
        (asserts! (>= average_balance amount) false)
        ;; Check if credit limit (based on activity + repayment scores) >= requested amount
        (asserts!
          (>=
            (loan-limit (+ (activity-score average_balance)
              (repayment-score total_loans on_time_loans late_loans)
            ))
            amount
          )
          false
        )
        ;; Initialize account data for new borrower
        (map-set account_data_map who {
          total_loans: total_loans,
          on_time_loans: on_time_loans,
          late_loans: late_loans,
        })
        true
      )
      ;; Handle returning borrowers (total_loans > 0)
      (begin
        ;; Verify no outstanding loans (on_time + late should equal total)
        (asserts! (is-eq (+ late_loans on_time_loans) total_loans) false)
        ;; Ensure average balance covers requested amount
        (asserts! (>= average_balance amount) false)
        ;; Check if credit limit (repayment score weighted more heavily) >= requested amount
        (asserts!
          (>=
            (loan-limit (+ (repayment-score total_loans on_time_loans late_loans)
              (activity-score average_balance)
            ))
            amount
          )
          false
        )
        ;; Update account data (though values don't change here)
        (map-set account_data_map who {
          total_loans: total_loans,
          on_time_loans: on_time_loans,
          late_loans: late_loans,
        })
        true
      )
    )
  )
)

;; PUBLIC FUNCTIONS - Lending Pool
;; Functions for lenders to deposit and withdraw funds

;; Deposit sBTC to earn yield from borrower interest payments
;; Lenders provide liquidity to the pool and earn proportional interest
;; Minimum deposit: 0.1 sBTC (10000000 satoshis)
;; Params: amount - amount of sBTC to deposit (in satoshis)
;; Returns: (ok true) on success, error code on failure
(define-public (lend (amount uint))
  (let ((lender_balance (default-to u0 (get balance (map-get? lender_info tx-sender)))))
    ;; Enforce minimum deposit amount
    (asserts! (>= amount u10000000) err_input_value_too_small)
    ;; Transfer sBTC from lender to contract
    (try! (contract-call? 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token
      transfer amount tx-sender (as-contract tx-sender) none
    ))
    ;; Update lender's balance and set lock/unlock blocks
    (map-set lender_info tx-sender {
      balance: (+ lender_balance amount),
      locked_block: stacks-block-height,
      unlock_block: (+ stacks-block-height
        (convert-days-to-blocks (var-get lock_duration_in_days))
      ),
    })
    ;; Update total pool size
    (var-set total_lending_pool (+ (var-get total_lending_pool) amount))
    ;; Emit success event
    (print {
      event: "lend_sucessful",
      user: tx-sender,
      amount: amount,
      locked_block: (default-to u0 (get locked_block (map-get? lender_info tx-sender))),
      unlock_block: (default-to u0 (get unlock_block (map-get? lender_info tx-sender))),
    })
    (ok true)
  )
)

;; Withdraw sBTC plus accrued interest from the lending pool
;; Lender's share includes proportional interest earned from loan repayments
;; Funds must be past unlock_block to withdraw
;; Params: amount - amount of sBTC to withdraw (in satoshis)
;; Returns: (ok true) on success, error code on failure
(define-public (withdraw (amount uint))
  (let (
      ;; Lender's recorded balance in pool shares
      (lender_balance (default-to u0 (get balance (map-get? lender_info tx-sender))))
      ;; Block when funds become withdrawable
      (unlock_block (default-to u0 (get unlock_block (map-get? lender_info tx-sender))))
      ;; Block when deposit was made
      (locked_block (default-to u0 (get locked_block (map-get? lender_info tx-sender))))
      ;; Current total sBTC in contract (principal + interest)
      (contract_balance (unwrap-panic (contract-call? 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token
        get-balance (as-contract tx-sender)
      )))
      ;; Calculate lender's proportional share including earned interest
      ;; Formula: (lender_balance / total_pool) * contract_balance
      (lender_pool_balance (if (> lender_balance u0)
        (/ (* lender_balance contract_balance)
          (if (> (var-get total_lending_pool) u0)
            (var-get total_lending_pool)
            u1
          ))
        u0
      ))
    )
    ;; Validate lender has deposits in the pool
    (asserts! (> lender_balance u0) err_not_a_lender)
    ;; Validate withdrawal amount doesn't exceed lender's share
    (asserts! (<= amount lender_pool_balance) err_pool_share_exceeded)
    ;; Validate lock-up period has expired
    (asserts! (<= unlock_block stacks-block-height) err_funds_locked)
    ;; Transfer sBTC from contract to lender
    (try! (as-contract (contract-call? 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token
      transfer amount tx-sender contract-caller none
    )))
    ;; Update total lending pool, accounting for interest distribution
    (var-set total_lending_pool
      (if (< lender_balance amount)
        (+ (- (var-get total_lending_pool) lender_balance)
          (- lender_pool_balance amount)
        )
        (- (var-get total_lending_pool) amount)
      ))
    ;; Update or delete lender info based on remaining balance
    (if (>= amount lender_balance)
      (if (is-eq amount lender_pool_balance)
        ;; Complete withdrawal: remove lender record
        (map-delete lender_info tx-sender)
        ;; Partial withdrawal: update with new balance
        (map-set lender_info tx-sender {
          balance: (- lender_pool_balance amount),
          locked_block: locked_block,
          unlock_block: unlock_block,
        })
      )
      ;; Update balance based on which is larger
      (if (< lender_balance lender_pool_balance)
        (map-set lender_info tx-sender {
          balance: (- lender_pool_balance amount),
          locked_block: locked_block,
          unlock_block: unlock_block,
        })
        (map-set lender_info tx-sender {
          balance: (- lender_balance amount),
          locked_block: locked_block,
          unlock_block: unlock_block,
        })
      )
    )
    ;; Emit success event
    (print {
      event: "withdrawal_sucessful",
      user: tx-sender,
      amount: amount,
    })
    (ok true)
  )
)

;; PUBLIC FUNCTIONS - Borrowing
;; Functions for borrowers to request and repay uncollateralized loans

;; Request uncollateralized loan based on algorithmic credit score
;; Credit score combines on-chain activity (30%) and repayment history (70%)
;; Borrowers can only have one active loan at a time
;; Params: amount - requested loan amount in satoshis
;; Returns: (ok true) on approval, error code on rejection
(define-public (apply-for-loan (amount uint))
  (let (
      ;; Get or initialize borrower's credit history
      (account_data (default-to {
        total_loans: u0,
        on_time_loans: u0,
        late_loans: u0,
      }
        (map-get? account_data_map tx-sender)
      ))
      ;; Calculate repayment deadline in blocks
      (loan_duration_in_blocks (convert-days-to-blocks (var-get loan_duration_in_days)))
    )
    ;; Validate loan amount is greater than 0
    (asserts! (> amount u0) err_input_value_too_small)
    ;; Run credit check: verify eligibility based on credit score and loan history
    (asserts! (loan-eligibility tx-sender account_data amount) err_not_eligible)
    ;; Ensure lending pool has sufficient liquidity
    (asserts!
      (>
        (unwrap-panic (contract-call? 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token
          get-balance (as-contract tx-sender)
        ))
        amount
      )
      err_funds_not_available_now
    )
    ;; Transfer loan amount from contract to borrower
    (try! (as-contract (contract-call? 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token
      transfer amount tx-sender contract-caller none
    )))
    ;; Record active loan details
    (map-set active_loans tx-sender {
      amount: amount,
      due_block: (+ stacks-block-height loan_duration_in_blocks),
      interest_rate: (var-get interest_rate_in_percent),
      issued_block: stacks-block-height,
    })
    ;; Increment total_loans counter (on_time/late updated on repayment)
    (map-set account_data_map tx-sender {
      total_loans: (+ u1 (get total_loans account_data)),
      on_time_loans: (get on_time_loans account_data),
      late_loans: (get late_loans account_data),
    })
    ;; Emit success event with loan details
    (print {
      event: "loan_grant_sucessful",
      user: tx-sender,
      amount_to_repay: (repayment-amount-due tx-sender),
      amount: amount,
      due_block: (+ stacks-block-height loan_duration_in_blocks),
      interest_rate: (var-get interest_rate_in_percent),
      issued_block: stacks-block-height,
    })
    (ok true)
  )
)

;; Repay loan principal plus interest and update credit history
;; Payment can be made by anyone on behalf of the borrower
;; Credit history updated based on whether payment is on-time or late
;; Params: who - principal address of borrower whose loan is being repaid
;; Returns: (ok true) on success, error code on failure
(define-public (repay-loan (who principal))
  (let (
      ;; Get active loan details for borrower
      (loan_data (default-to {
        amount: u0,
        due_block: u0,
        interest_rate: u0,
        issued_block: u0,
      }
        (map-get? active_loans who)
      ))
      ;; Calculate total repayment amount (principal + interest)
      (repayment_amount (repayment-amount-due who))
    )
    ;; Validate borrower has an active loan
    (asserts! (> (get amount loan_data) u0) err_not_eligible)
    ;; Transfer repayment amount from caller to contract
    (try! (contract-call? 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token
      transfer repayment_amount tx-sender (as-contract tx-sender) none
    ))
    ;; Update credit history (on-time vs late) and remove active loan
    (check-for-late-payment-and-update-data-after-payment who)
    ;; Emit success event
    (print {
      event: "loan_repaid_sucessfully",
      user: tx-sender,
      amount: repayment_amount,
    })
    (ok true)
  )
)

;; PUBLIC FUNCTIONS - Admin Controls
;; Functions restricted to contract admin for managing protocol parameters

;; Transfer admin privileges to a new address
;; Params: who - principal address of new admin
;; Returns: (ok true) on success
(define-public (set-admin (who principal))
  (begin
    (asserts! (is-admin) err_not_admin)
    (ok (var-set admin who))
  )
)

;; Update default loan duration for new loans
;; Minimum: 7 days to ensure reasonable repayment window
;; Params: duration - loan duration in days
;; Returns: (ok true) on success
(define-public (set-loan-duration-in-days (duration uint))
  (begin
    (asserts! (is-admin) err_not_admin)
    (asserts! (>= duration u7) err_input_value_too_small)
    (ok (var-set loan_duration_in_days duration))
  )
)

;; Update lock-up period for new lender deposits
;; 0 = no lock-up, funds immediately withdrawable after deposit
;; Params: duration - lock-up duration in days
;; Returns: (ok true) on success
(define-public (set-lock-duration-in-days (duration uint))
  (begin
    (asserts! (is-admin) err_not_admin)
    (asserts! (> duration u0) err_input_value_too_small)
    (ok (var-set lock_duration_in_days duration))
  )
)

;; Update interest rate charged on new loans
;; Rate is expressed as percentage (e.g., 15 = 15% APR)
;; Params: rate - interest rate as whole number percentage
;; Returns: (ok true) on success
(define-public (set-interest-rate-in-percent (rate uint))
  (begin
    (asserts! (is-admin) err_not_admin)
    (asserts! (> rate u0) err_input_value_too_small)
    (ok (var-set interest_rate_in_percent rate))
  )
)

;; READ-ONLY FUNCTIONS - Lending Pool
;; View functions for querying lending pool state (no state changes)

;; Calculate maximum withdrawable amount for a lender
;; Includes proportional share of interest earned from loan repayments
;; Params: lender - principal address of lender to check
;; Returns: (ok {withdrawal_limit: uint}) with max withdrawable amount in satoshis
(define-read-only (get-withdrawal-limit (lender principal))
  (let (
      ;; Get lender's balance in pool shares
      (lender_balance (default-to u0 (get balance (map-get? lender_info tx-sender))))
      ;; Get total sBTC currently in contract
      (contract_balance (unwrap-panic (contract-call? 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token
        get-balance (as-contract tx-sender)
      )))
      ;; Calculate proportional share including interest
      (lender_pool_balance (if (> lender_balance u0)
        (/ (* lender_balance contract_balance)
          (if (> (var-get total_lending_pool) u0)
            (var-get total_lending_pool)
            u1
          ))
        u0
      ))
    )
    ;; Ensure caller is a lender
    (asserts! (> lender_balance u0) err_not_a_lender)
    (ok { withdrawal_limit: lender_pool_balance })
  )
)

;; Get overall lending pool statistics
;; Returns: pool parameters and current liquidity status
(define-read-only (get-lending-pool-info)
  (ok {
    lock_duration_in_days: (var-get lock_duration_in_days),    ;; Current lock-up period
    pool_size: (var-get total_lending_pool),                   ;; Total pool shares
    contract_balance: (unwrap-panic (contract-call? 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token
      get-balance (as-contract tx-sender)
    )),                                                        ;; Actual sBTC in contract
  })
)

;; Get detailed information for the calling lender
;; Returns: balance, pool share, lock status, and time deposited
(define-read-only (get-lender-info)
  (let (
      ;; Lender's balance in pool shares
      (lender_balance (default-to u0 (get balance (map-get? lender_info tx-sender))))
      ;; Current contract sBTC balance
      (contract_balance (unwrap-panic (contract-call? 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token
        get-balance (as-contract tx-sender)
      )))
      ;; Block when deposit was locked
      (locked_block (default-to u0 (get locked_block (map-get? lender_info tx-sender))))
      ;; Block when funds become withdrawable
      (unlock_block (default-to u0 (get unlock_block (map-get? lender_info tx-sender))))
    )
    (ok {
      lender_balance: lender_balance,                          ;; Pool shares owned
      lender_pool_balance: (if (> lender_balance u0)           ;; Actual sBTC value including interest
        (/ (* lender_balance contract_balance) (var-get total_lending_pool))
        u0
      ),
      locked_block: locked_block,                              ;; When deposit was made
      unlock_block: unlock_block,                              ;; When withdrawal allowed
      time_in_pool_in_seconds: (/ (- stacks-block-height locked_block) (time-per-block)),  ;; Duration in pool
    })
  )
)

;; READ-ONLY FUNCTIONS - Borrowing
;; View functions for querying borrower status and loan terms

;; Calculate total repayment amount (principal + interest) for an active loan
;; Params: who - principal address of borrower
;; Returns: total amount due in satoshis (0 if no active loan)
(define-read-only (repayment-amount-due (who principal))
  (let (
      ;; Get loan principal
      (amount (default-to u0 (get amount (map-get? active_loans who))))
      ;; Get interest rate at time of loan issuance
      (interest_rate (default-to u0 (get interest_rate (map-get? active_loans who))))
    )
    ;; Calculate: principal + (principal * rate / 100)
    (if (> interest_rate u0)
      (+ amount (/ (* amount interest_rate) u100))
      u0
    )
  )
)

;; Get detailed credit scoring breakdown for a borrower
;; Shows credit score components and resulting loan limit
;; Params: who - principal address to evaluate
;; Returns: credit score, tier limit, average balance, and max loan amount
(define-read-only (get-loan-limit-info (who principal))
  (let (
      ;; Get borrower's credit history
      (account_data (default-to {
        total_loans: u0,
        on_time_loans: u0,
        late_loans: u0,
      }
        (map-get? account_data_map tx-sender)
      ))
      (total_loans (get total_loans account_data))
      (on_time_loans (get on_time_loans account_data))
      (late_loans (get late_loans account_data))
      ;; Calculate 3-month average sBTC balance
      (average_balance (get-average-balance who))
      ;; Calculate credit score and map to tier limit
      (credit_score_limit (loan-limit (+ (repayment-score total_loans on_time_loans late_loans)
        (activity-score average_balance)
      )))
    )
    ;; Check if borrower has outstanding loan (total != on_time + late)
    (asserts! (is-eq total_loans (+ late_loans on_time_loans))
      (ok {
        credit_score: (+ (repayment-score total_loans on_time_loans late_loans)
          (activity-score average_balance)
        ),
        credit_score_limit: credit_score_limit,
        average_balance: average_balance,
        loan_limit: u0,  ;; No new loan allowed while one is active
      })
    )
    ;; If average balance < credit tier limit, cap loan at tier limit
    (asserts! (< average_balance credit_score_limit)
      (ok {
        credit_score: (+ (repayment-score total_loans on_time_loans late_loans)
          (activity-score average_balance)
        ),
        credit_score_limit: credit_score_limit,
        average_balance: average_balance,
        loan_limit: credit_score_limit,  ;; Limited by credit tier
      })
    )
    ;; Otherwise, cap loan at average balance (conservative approach)
    (ok {
      credit_score: (+ (repayment-score total_loans on_time_loans late_loans)
        (activity-score average_balance)
      ),
      credit_score_limit: credit_score_limit,
      average_balance: average_balance,
      loan_limit: average_balance,  ;; Limited by available balance
    })
  )
)

;; Check if borrower is eligible for a new loan
;; Returns loan limit, interest rate, duration, and eligibility message
;; Params: who - principal address to evaluate
;; Returns: eligibility status with loan terms
(define-read-only (get-loan-eligibility-info (who principal))
  (let (
      ;; Get borrower's credit history
      (account_data (default-to {
        total_loans: u0,
        on_time_loans: u0,
        late_loans: u0,
      }
        (map-get? account_data_map who)
      ))
      (total_loans (get total_loans account_data))
      (on_time_loans (get on_time_loans account_data))
      (late_loans (get late_loans account_data))
      ;; Calculate 3-month average balance
      (average_balance (get-average-balance who))
      ;; Calculate maximum loan based on credit score
      (credit_score_limit (loan-limit (+ (repayment-score total_loans on_time_loans late_loans)
        (activity-score average_balance)
      )))
    )
    ;; Check if borrower has an outstanding unpaid loan
    (if (> total_loans (+ on_time_loans late_loans))
      (ok {
        message: "address has an unpaid loan",  ;; Ineligible: must repay first
        loan_limit: u0,
        interest_rate: (var-get interest_rate_in_percent),
        duration: (var-get loan_duration_in_days),
      })
      ;; If credit score tier >= average balance, limit by balance
      (if (>= credit_score_limit average_balance)
        (ok {
          message: "eligible for loan",
          loan_limit: average_balance,  ;; Conservative: cap at balance
          interest_rate: (var-get interest_rate_in_percent),
          duration: (var-get loan_duration_in_days),
        })
        ;; Otherwise, limit by credit tier
        (ok {
          message: "eligible for loan",
          loan_limit: credit_score_limit,  ;; Limited by credit score tier
          interest_rate: (var-get interest_rate_in_percent),
          duration: (var-get loan_duration_in_days),
        })
      )
    )
  )
)

;; Get comprehensive borrower information
;; Includes active loan details, credit history, and repayment amount
;; Params: who - principal address of borrower
;; Returns: all borrower-related data
(define-read-only (get-borrower-info (who principal))
  (ok {
    active_loan: (map-get? active_loans who),           ;; Current loan if any
    account_data: (map-get? account_data_map who),      ;; Credit history
    repayment_amount_due: (repayment-amount-due who),   ;; Total amount to repay
  })
)

;; Get current Stacks block height
;; Useful for calculating time until loan due date or unlock block
;; Params: who - unused parameter (kept for interface compatibility)
;; Returns: current block height
(define-read-only (get-block-height (who principal))
  (ok { stacks_block_height: stacks-block-height })
)
