// Boot log
console.log('Booting backend (CJS)...')

require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { Client, isValidAddress } = require('xrpl')

const app = express()
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }))
app.use(express.json())

const PORT = process.env.PORT || 3000
const XRPL_ENDPOINT = process.env.XRPL_ENDPOINT || 'wss://s.altnet.rippletest.net:51233'

// XRPL client
let xrplClient
async function connectXRPL () {
  xrplClient = new Client(XRPL_ENDPOINT)
  await xrplClient.connect()
  console.log('✅ Connected to XRPL Testnet:', XRPL_ENDPOINT)
}

// Health
app.get('/health', (req, res) => {
  res
    .type('text')
    .send('ok\n--\n' + (xrplClient && xrplClient.isConnected() ? 'True' : 'False'))
})

// /credential — prepara (non invia) la CredentialCreate
app.post('/credential', async (req, res) => {
  try {
    const { subject, credentialType, uri, requester } = req.body || {}

    // 1) Controlli
    if (!subject || !credentialType) {
      return res.status(400).json({ error: 'Missing fields: subject or credentialType' })
    }
    if (!isValidAddress(subject)) {
      return res.status(400).json({ error: 'Invalid XRPL address: subject' })
    }
    if (requester && !isValidAddress(requester)) {
      return res.status(400).json({ error: 'Invalid XRPL address: requester' })
    }

    // 2) Prepara la TX
    const tx = {
      TransactionType: 'CredentialCreate',
      Account: requester,
      Subject: subject,
      CredentialType: credentialType,
      ...(uri ? { URI: uri } : {})
    }

    // 3) Risposta (solo preview)
    return res.json({
      ok: true,
      message: 'Credential tx prepared ✅',
      xrplConnected: xrplClient && xrplClient.isConnected() ? true : false,
      preparedTransaction: tx
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Internal error' })
  }
})

// Start server
app.listen(PORT, async () => {
  console.log(`API listening on http://localhost:${PORT}`)
  try {
    await connectXRPL()
  } catch (e) {
    console.error('XRPL connect error:', e && e.message ? e.message : e)
  }
})
