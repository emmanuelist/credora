;; Title: Credora Protocol
;; Summary: Trust-scored Bitcoin lending on Stacks
;; Description: Credora enables permissionless sBTC lending with algorithmic credit scoring.
;;              Lenders earn yield, borrowers access instant liquidity without collateral based on on-chain reputation.

;; CONSTANTS - Error Codes

(define-constant err_not_admin (err u100))
(define-constant err_input_value_too_small (err u101))
(define-constant err_not_a_lender (err u102))
(define-constant err_pool_share_exceeded (err u103))
(define-constant err_not_eligible (err u104))
(define-constant err_funds_not_available_now (err u105))
(define-constant err_funds_locked (err u106))
(define-constant err_unable_to_get_block (err u107))

;; CONSTANTS - Credit Tier Limits

(define-constant tier_0_limit u10000)
(define-constant tier_1_limit u50000)
(define-constant tier_2_limit u100000)
(define-constant tier_3_limit u300000)
(define-constant tier_4_limit u500000)
(define-constant tier_5_limit u1000000)

;; DATA STORAGE

(define-map lender_info principal {
  balance: uint,
  locked_block: uint,
  unlock_block: uint
})

(define-map active_loans principal {
  amount: uint,
  due_block: uint,
  interest_rate: uint,
  issued_block: uint
})

(define-map account_data_map principal {
  total_loans: uint,
  on_time_loans: uint,
  late_loans: uint
})

(define-data-var admin principal tx-sender)
(define-data-var total_lending_pool uint u0)
(define-data-var interest_rate_in_percent uint u15)
(define-data-var loan_duration_in_days uint u14)
(define-data-var lock_duration_in_days uint u0)

;; PRIVATE HELPER FUNCTIONS

(define-private (is-admin)
  (begin
    (asserts! (is-eq contract-caller (var-get admin)) false)
    true
  )
)

;; 600 seconds per block
(define-read-only (time-per-block)
  (* u10 u60)
)

(define-private (convert-days-to-blocks (days uint))
  (/ (* days u24 u60 u60) (time-per-block))
)

;; Calculates 3-month average sBTC balance across historical snapshots
(define-private (get-average-balance (who principal))
  (let (
    (stacks_stacks_id_header_hash_1 (unwrap! (get-stacks-block-info? id-header-hash (- stacks-block-height (convert-days-to-blocks u1))) u0))
    (stacks_stacks_id_header_hash_2 (unwrap! (get-stacks-block-info? id-header-hash (- stacks-block-height (convert-days-to-blocks u31))) u0))
    (stacks_stacks_id_header_hash_3 (unwrap! (get-stacks-block-info? id-header-hash (- stacks-block-height (convert-days-to-blocks u61))) u0))
  )
    (/ 
      (+ 
        (at-block stacks_stacks_id_header_hash_1 (unwrap! (contract-call? 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token get-balance who) u0))
        (at-block stacks_stacks_id_header_hash_2 (unwrap! (contract-call? 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token get-balance who) u0))
        (at-block stacks_stacks_id_header_hash_3 (unwrap! (contract-call? 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token get-balance who) u0))
      ) 
      u3
    )
  )
)

;; Maps credit score to borrowing tier
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

;; Scores on-chain activity (0-300 pts)
(define-private (activity-score (average_balance uint))
  (begin 
    (asserts! (> average_balance u0) u0)
    (asserts! (>= average_balance tier_0_limit) u100)
    (asserts! (>= average_balance tier_1_limit) u220)
    (asserts! (>= average_balance tier_2_limit) u240)
    (asserts! (>= average_balance tier_3_limit) u260)
    (asserts! (>= average_balance tier_4_limit) u280)
    u300
  )
)

;; Scores repayment history (0-700 pts)
(define-private (repayment-score (total_loans uint) (on_time_loans uint) (late_loans uint))
  (if (> on_time_loans u0)
    (if (< total_loans u5)
      (/ (* on_time_loans u700) (+ total_loans u5))
      (/ (* on_time_loans u700) total_loans)
    )
    u0
  )
)

;; Updates borrower stats and marks loan as paid
(define-private (check-for-late-payment-and-update-data-after-payment (who principal))
  (let (
    (account_data (default-to 
      { 
        total_loans: u0,
        on_time_loans: u0,
        late_loans: u0
      }
      (map-get? account_data_map who)
    ))
    (due_block (default-to u0 (get due_block (map-get? active_loans who))))
  ) 
    (if (<= stacks-block-height due_block)
      (map-set account_data_map who {
        total_loans: (get total_loans account_data),
        on_time_loans: (+ (get on_time_loans account_data) u1),
        late_loans: (get late_loans account_data)
      })
      (map-set account_data_map who {
        total_loans: (get total_loans account_data),
        on_time_loans: (get on_time_loans account_data),
        late_loans: (+ (get late_loans account_data) u1)
      })
    )
    (map-delete active_loans who)
  )
)