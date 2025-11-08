// ==========================================
// XRPL Credentials Backend (CommonJS version)
// ==========================================
// Exposes two endpoints to create and accept XRPL Credentials,
// using XUMM/Xaman for transaction signing. Designed to run
// against XRPL Testnet unless specified differently in .env.

console.log('Booting backend (CJS, CredentialCreate)...')

require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { Client, isValidAddress } = require('xrpl')
const { XummSdk } = require('xumm-sdk')

// ------------------------------------------
// Express application configuration
// ------------------------------------------
const app = express()

// Allow only local development origins
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }))
app.use(express.json())

// Environment-based configuration
const PORT = process.env.PORT || 3000
const XRPL_ENDPOINT =
  process.env.XRPL_ENDPOINT || 'wss://s.altnet.rippletest.net:51233'

// Initialize XUMM SDK (used to create signing payloads)
const xumm = new XummSdk(process.env.XUMM_API_KEY, process.env.XUMM_API_SECRET)

// ------------------------------------------
// XRPL WebSocket client (shared connection)
// ------------------------------------------
let xrplClient

async function connectXRPL() {
  xrplClient = new Client(XRPL_ENDPOINT)
  await xrplClient.connect()
  console.log('✅ Connected to XRPL:', XRPL_ENDPOINT)
}

// ------------------------------------------
// Health check endpoint
// Returns server status + XRPL connection state
// ------------------------------------------
app.get('/health', (req, res) => {
  res
    .type('text')
    .send(
      'ok\n--\n' +
        (xrplClient && xrplClient.isConnected() ? 'True' : 'False')
    )
})

// ------------------------------------------
// POST /credential
// Prepare a CredentialCreate transaction.
// Returns a XUMM signing URL and UUID.
// ------------------------------------------
app.post('/credential', async (req, res) => {
  try {
    const { subject, credentialType, uri, requester } = req.body || {}

    // Required fields and basic validation
    if (!subject || !credentialType || !requester) {
      return res
        .status(400)
        .json({ error: 'Missing fields: subject, credentialType or requester' })
    }
    if (!isValidAddress(subject)) {
      return res.status(400).json({ error: 'Invalid XRPL address: subject' })
    }
    if (!isValidAddress(requester)) {
      return res.status(400).json({ error: 'Invalid XRPL address: requester' })
    }

    // CredentialType must be HEX on XRPL — convert if ASCII
    const credentialTypeHex = /^[0-9a-fA-F]+$/.test(credentialType)
      ? credentialType
      : Buffer.from(credentialType, 'utf8').toString('hex')

    // Construct the CredentialCreate transaction JSON
    const tx = {
      TransactionType: 'CredentialCreate',
      Account: requester, // issuer / signer
      Subject: subject,   // credential recipient
      CredentialType: credentialTypeHex,
      ...(uri ? { URI: uri } : {})
    }

    // Create a XUMM signing payload (auto-submits after signature)
    const payload = await xumm.payload.create({
      txjson: tx,
      options: { submit: true, expire: 300 } // expires in 5 minutes
    })

    // Basic safety check: XUMM should always return signUrl + uuid
    if (!payload?.next?.always || !payload?.uuid) {
      return res
        .status(500)
        .json({ error: 'XUMM payload incomplete or invalid' })
    }

    // Respond with signing URL + metadata
    return res.json({
      ok: true,
      message: 'CredentialCreate payload prepared',
      preparedTransaction: tx,
      signUrl: payload.next.always,
      uuid: payload.uuid
    })
  } catch (e) {
    console.error('Payload error:', e)
    return res.status(500).json({
      error: 'Internal error',
      detail: e?.message || String(e)
    })
  }
})

// ------------------------------------------
// Helper: Convert ASCII string → HEX
// Used for CredentialType normalization.
// ------------------------------------------
function asciiToHex(str) {
  return Buffer.from(str, 'utf8').toString('hex')
}

// ------------------------------------------
// POST /credential/accept
// Prepare a CredentialAccept transaction.
// The "subject" must sign this acceptance.
// ------------------------------------------
app.post('/credential/accept', async (req, res) => {
  try {
    const { issuer, subject, credentialType } = req.body || {}

    // Required fields
    if (!issuer || !subject || !credentialType) {
      return res.status(400).json({
        error: 'Missing fields: issuer, subject, credentialType'
      })
    }

    // Address validation
    if (!isValidAddress(issuer)) {
      return res.status(400).json({ error: 'Invalid XRPL address: issuer' })
    }
    if (!isValidAddress(subject)) {
      return res.status(400).json({ error: 'Invalid XRPL address: subject' })
    }

    // Convert credential type to hex if needed
    const credTypeHex = /^[0-9a-fA-F]+$/.test(credentialType)
      ? credentialType
      : asciiToHex(credentialType)

    // Build the CredentialAccept transaction
    const tx = {
      TransactionType: 'CredentialAccept',
      Account: subject,  // signer = subject accepting the credential
      Issuer: issuer,
      CredentialType: credTypeHex
    }

    // Create a signing payload for XUMM/Xaman
    const payload = await xumm.payload.create({
      txjson: tx,
      options: { submit: true, expire: 300 }
    })

    // Validate response integrity
    if (!payload?.next?.always || !payload?.uuid) {
      return res
        .status(500)
        .json({ error: 'XUMM payload incomplete or invalid' })
    }

    return res.json({
      ok: true,
      message: 'CredentialAccept payload prepared',
      signUrl: payload.next.always,
      uuid: payload.uuid,
      preparedTransaction: tx
    })
  } catch (e) {
    console.error('Accept error:', e)
    return res.status(500).json({
      error: 'Internal error',
      detail: e?.message || String(e)
    })
  }
})

// ------------------------------------------
// Server startup: boot HTTP API + connect XRPL
// ------------------------------------------
app.listen(PORT, async () => {
  console.log(`API listening on http://localhost:${PORT}`)
  try {
    await connectXRPL()
  } catch (e) {
    console.error('XRPL connect error:', e)
  }
})

/*
Development notes:
- Run:  node server.cjs
- Requires: XRPL WebSocket endpoint + XUMM credentials in .env
- Returned "signUrl" should be opened by the frontend to trigger Xaman signing.
*/
