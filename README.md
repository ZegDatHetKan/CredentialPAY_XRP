XRPL Credential Demo (Testnet)
==============================

This project demonstrates a complete flow for issuing and accepting
XRPL Credentials using:

- XRPL Testnet
- XUMM/Xaman wallet (OAuth2 PKCE login)
- React (frontend)
- Express (backend)
- XUMM SDK for transaction preparation and signing


1. Overview
-----------

The demo allows a user to:

1. Connect their XRPL account via Xaman (OAuth2)
2. Create a Credential for another XRPL address (CredentialCreate)
3. Open Xaman and sign the transaction
4. Claim/accept the credential (CredentialAccept)
5. Sign again in Xaman to finalize the acceptance transaction

Both flows use XUMM’s signing payloads and auto-submit to XRPL Testnet
after signature.


2. Project Structure
--------------------

frontend/
  App.jsx       -> Wallet connection, form UI, and calling the backend
  ...

backend/
  server.cjs    -> REST API for CredentialCreate and CredentialAccept
  .env.example  -> Example environment variables


3. Requirements
---------------

- Node.js 18 or later
- XUMM Developer API Key and Secret
- XRPL Testnet WebSocket endpoint
- A Xaman wallet (mobile app)


4. Environment Variables
------------------------

In backend/.env:

  PORT=3000
  XRPL_ENDPOINT=wss://s.altnet.rippletest.net:51233
  XUMM_API_KEY=your_key
  XUMM_API_SECRET=your_secret

In frontend/.env:

  VITE_XUMM_API_KEY=your_key
  VITE_BACKEND_URL=http://localhost:3000


5. Running the Project
----------------------

Backend:
  cd backend
  npm install
  node server.cjs

Frontend:
  cd frontend
  npm install
  npm run dev

Open the application at:

  http://localhost:5173


6. Usage Flow
-------------

1. Click “Connect Xaman”
2. Authorize in the Xaman app
3. Fill the CredentialCreate form:
     - Subject address
     - Credential type
     - Optional URI
4. Click “Send Credential”
   → A XUMM signing page will open. Sign it.
5. After creation, the “Claim Credential” button appears
6. Click it to trigger the CredentialAccept flow
7. Sign again in XUMM to accept the credential


7. API Endpoints
----------------

POST /credential
  Prepares a CredentialCreate transaction and returns:
    - signUrl (Xaman signing link)
    - uuid
    - prepared transaction JSON

POST /credential/accept
  Prepares a CredentialAccept transaction and returns
  the same fields.


8. Notes
--------

- CredentialType may be provided in ASCII or HEX
  (backend converts when needed).
- All signing links open XUMM’s interface directly.
- By default, transactions auto-submit after signing.
- This demo is intended for Testnet.


9. License
----------

MIT or choose your own license.
