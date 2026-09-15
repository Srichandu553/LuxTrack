import { useState } from "react";
import {
    login,
    register,
    requestPasswordReset,
    resetPassword
} from "../services/authService.js";
import "./AdminLogin.css";

function AdminLogin({ onLogin, initialMode = "login", onBack }) {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [mode, setMode] = useState(() =>
        new URLSearchParams(window.location.search).has("token")
            ? "reset"
            : initialMode
    );
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError("");
        setNotice("");

        try {
            if (mode === "forgot") {
                const response = await requestPasswordReset(email);
                setNotice(
                    response.resetToken
                        ? `Development reset token: ${response.resetToken}`
                        : response.message
                );
            } else if (mode === "reset") {
                const token = new URLSearchParams(window.location.search).get("token");
                const response = await resetPassword(token, password);
                setNotice(response.message);
                setMode("login");
            } else {
                const response = mode === "register"
                    ? await register(name, email, password)
                    : await login(email, password);
                onLogin(response.user);
            }
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                "Unable to sign in to LuxTrack."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="admin-login-page">
            <form className="admin-login-card" onSubmit={submit}>
                {onBack && <button type="button" className="text-login-button login-back-home" onClick={onBack}>← Back to home</button>}
                <p className="admin-login-eyebrow">LUXTRACK</p>
                <h1>
                    {mode === "register"
                        ? "Create your account"
                        : mode === "forgot"
                        ? "Recover your password"
                        : mode === "reset"
                        ? "Set a new password"
                        : "Sign in to continue"}
                </h1>
                <p className="admin-login-subtitle">
                    {mode === "register"
                        ? "Create an account to access your LuxTrack workspace."
                        : "Track luxury assets and valuation intelligence securely."}
                </p>

                {mode === "register" && (
                    <label>
                        Full name
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            autoComplete="name"
                            required
                        />
                    </label>
                )}

                <label>
                    Email
                    <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        autoComplete="email"
                        required
                    />
                </label>

                {mode !== "forgot" && <label>
                    Password
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="current-password"
                        required
                        minLength={6}
                    />
                </label>}

                {error && <p className="admin-login-error">{error}</p>}
                {notice && <p className="admin-login-notice">{notice}</p>}

                <button type="submit" disabled={loading}>
                    {loading
                        ? "Please wait..."
                        : mode === "register"
                        ? "Create account"
                        : mode === "forgot"
                        ? "Send reset instructions"
                        : mode === "reset"
                        ? "Update password"
                        : "Sign in"}
                </button>

                {mode === "login" && (
                    <>
                        <button type="button" className="text-login-button" onClick={() => setMode("forgot")}>
                            Forgot password?
                        </button>
                        <button type="button" className="text-login-button" onClick={() => setMode("register")}>
                            Create an account
                        </button>
                    </>
                )}

                {(mode === "register" || mode === "forgot" || mode === "reset") && (
                    <button type="button" className="text-login-button" onClick={() => setMode("login")}>
                        Back to sign in
                    </button>
                )}
            </form>
        </main>
    );
}

export default AdminLogin;
