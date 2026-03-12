## What Will Be Implemented
- Enforce your single-DB ownership/visibility rules strictly using `req.user.id` + `req.user.role` on every API.
- Remove unintended PII exposure (phones/precise locations) from shared/public views.
- Make transporter deal acceptance “first come wins” and transaction-safe.
- Add transporter earnings recording on delivery completion.

## Backend Changes
### 1) Listings (Shared vs Owner)
- Public buyer-facing listing APIs (`GET /listings`, `GET /listings/:id`, search):
  - Keep `status = AVAILABLE` visibility.
  - Return only safe farmer fields (id + display name + district/state). No phone/village.
- Farmer dashboard APIs (`GET /listings/my/listings` etc.):
  - Return full farmer-owned data only for `farmerId = req.user.id`.

### 2) Orders + Negotiations (Strict Isolation)
- Require role BUYER for `POST /orders/create`.
- If `negotiationId` is provided when creating an order:
  - Validate negotiation belongs to logged-in buyer, matches the listing, and is OPEN.
  - Only then link negotiation to the created order.
- Keep buyer-only/ farmer-only filters on order listing endpoints.

### 3) Deliveries (Shared Until Accepted)
- Transporter “available deals” endpoint returns only:
  - distance, pricePerKm, totalCost, coarse pickup/drop (no phone).
  - Only `status = WAITING_FOR_TRANSPORTER` deals.
- After acceptance:
  - Deal disappears from other transporters.
  - Appears only to assigned transporter + related buyer/farmer.

### 4) Transaction-Safe Acceptance
- Replace read-then-update with atomic update condition:
  - accept succeeds only if `status=WAITING_FOR_TRANSPORTER` and `transporterId` is null.
  - otherwise return “already accepted”.

### 5) WebSocket Privacy
- Remove global `io.emit('delivery:created', ...)` and do not broadcast OTPs.
- Emit sanitized “new open deal” events to a transporter audience room only.
- Emit detailed status events to `order-{orderId}` room only.

### 6) Earnings
- Add Prisma model `Earning` (or `Earnings`) tied to `Delivery` + `transporterId`.
- On delivery COMPLETED:
  - write an earning record exactly once (distance * pricePerKm).
- Add transporter earnings endpoints filtered by `transporterId=req.user.id`.

## Frontend Changes
- Adjust UI to match new response shapes:
  - Buyer listing cards show only safe farmer info.
  - Transporter open deals list shows no buyer/farmer phone until accepted.
  - Add transporter earnings dashboard view from new endpoints.

## Verification
- Test matrices:
  - Buyer cannot access other buyers’ orders/negotiations.
  - Farmer sees only own listings/orders.
  - Transporter sees all OPEN deals, and only own ASSIGNED/completed deliveries.
  - Two transporters racing to accept: only one wins.
  - Earnings created only after COMPLETED.

If you confirm this plan, I will start implementing immediately (schema + backend + frontend + tests).