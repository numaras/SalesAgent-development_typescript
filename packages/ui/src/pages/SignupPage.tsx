/**
 * Public landing; start OAuth flow.
 * Server: GET /signup (landing), GET /signup/start (redirects to /auth/google).
 * Use full-page navigation to /signup/start so server can set session and redirect.
 */
export default function SignupPage() {
  const startOAuth = () => {
    window.location.href = "/signup/start";
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui", maxWidth: 560, margin: "0 auto" }}>
      <h1 style={{ marginBottom: "1rem" }}>Sign up</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        Create or join a tenant. Sign in with Google to get started.
      </p>
      <button
        type="button"
        onClick={startOAuth}
        style={{
          padding: "0.75rem 1.5rem",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: "pointer",
          background: "#1a73e8",
          color: "white",
          border: "none",
          borderRadius: 8,
        }}
      >
        Continue with Google
      </button>
    </main>
  );
}
