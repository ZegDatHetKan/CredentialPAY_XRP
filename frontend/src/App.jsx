import { useEffect, useState } from "react";
import { XummPkce } from "xumm-oauth2-pkce";

// Redirect back to the same origin (e.g. http://localhost:5173)
const redirectUri = window.location.origin;

// XUMM/Xaman OAuth2 client (PKCE flow)
const xumm = new XummPkce(
  import.meta.env.VITE_XUMM_API_KEY,
  redirectUri
);

function App() {
  const [user, setUser] = useState(null); // connected Xaman user account

  // Form fields for CredentialCreate
  const [subject, setSubject] = useState("");
  const [credentialType, setCredentialType] = useState("");
  const [uri, setUri] = useState("");

  // Used to display the "Claim Credential" button after creation
  const [hasCreatedCredential, setHasCreatedCredential] = useState(false);

  // --------------------------------------------
  // Restore XUMM session if it exists (auto-login)
  // --------------------------------------------
  useEffect(() => {
    xumm.on("retrieved", async () => {
      const state = await xumm.state();
      setUser(state?.me || null);
    });
  }, []);

  // --------------------------------------------
  // Connect to Xaman (OAuth2 + wallet authorization)
  // --------------------------------------------
  const connect = async () => {
    await xumm.authorize();
  };

  // --------------------------------------------
  // Log out from the XUMM session
  // --------------------------------------------
  const logout = async () => {
    await xumm.logout();
    setUser(null);
    setHasCreatedCredential(false);
  };

  // --------------------------------------------
  // Submit CredentialCreate to backend
  // Backend returns a signUrl (Xaman signing link)
  // --------------------------------------------
  const submitCredential = async (e) => {
    e.preventDefault();

    if (!user?.account) {
      alert("Connect Xaman first.");
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/credential`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          credentialType,
          uri,
          requester: user.account // signer/issuer
        }),
      });

      const data = await res.json().catch(() => ({}));
      console.log("Create response:", data);

      if (!res.ok) throw new Error(data?.error || "Credential creation failed");

      // Open Xaman signing page
      if (data?.signUrl) {
        window.open(data.signUrl, "_blank");
        alert("Open Xaman and SIGN the creation ✅");
        setHasCreatedCredential(true); // show Claim button
      } else {
        alert("No signUrl returned for creation.");
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // --------------------------------------------
  // Submit CredentialAccept (subject accepts)
  // Note: subject = user.account
  // --------------------------------------------
  const claimCredential = async () => {
    if (!user?.account) {
      alert("Connect Xaman first.");
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/credential/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            issuer: user.account,       // in this simplified demo, issuer = subject
            subject: user.account,
            credentialType: credentialType || "member_v1"
          }),
        }
      );

      const data = await res.json().catch(() => ({}));
      console.log("Accept response:", data);

      if (!res.ok) throw new Error(data?.error || "Accept failed");

      // Open Xaman signing page
      if (data?.signUrl) {
        window.open(data.signUrl, "_blank");
        alert("Open Xaman and SIGN the claim ✅");
      } else {
        alert("No signUrl returned for claim.");
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: "600px" }}>
      <h1>Issuing Credential certifiates on XRP</h1>

      {/* Wallet connection section */}
      {!user && (
        <button
          onClick={connect}
          style={{ padding: "10px 20px", marginBottom: 20 }}
        >
          Connect Xaman
        </button>
      )}

      {/* Show account + logout when connected */}
      {user && (
        <div style={{ marginBottom: 20 }}>
          <p>
            Connected as: <b>{user.account}</b>
          </p>
          <button
            onClick={logout}
            style={{ padding: "8px 16px", marginRight: 10 }}
          >
            Logout
          </button>
        </div>
      )}

      <hr />

      {/* Credential creation form (only visible if connected) */}
      {user && (
        <form onSubmit={submitCredential} style={{ marginTop: 20 }}>
          <div style={{ marginBottom: 10 }}>
            <label>Subject (XRPL Address):</label>
            <br />
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="rXXXX..."
              style={{ width: "100%", padding: 8 }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>Credential Type:</label>
            <br />
            <input
              type="text"
              value={credentialType}
              onChange={(e) => setCredentialType(e.target.value)}
              placeholder="member_v1"
              style={{ width: "100%", padding: 8 }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>URI (optional):</label>
            <br />
            <input
              type="text"
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              placeholder="https://example.com"
              style={{ width: "100%", padding: 8 }}
            />
          </div>

          <button
            type="submit"
            style={{ padding: "10px 20px", marginTop: 10 }}
          >
            Send Credential
          </button>
        </form>
      )}

      {/* Claim button appears only after a credential was created */}
      {user && hasCreatedCredential && (
        <div style={{ marginTop: 30 }}>
          <button onClick={claimCredential} style={{ padding: "10px 20px" }}>
            Claim Credential
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
