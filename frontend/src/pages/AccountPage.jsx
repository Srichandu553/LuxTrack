import { useEffect, useMemo, useState } from "react";
import { changePassword, getProfile, logout, updateProfile } from "../services/authService.js";
import "./AccountPage.css";

const initials = (name = "") => name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "LT";

function AccountPage({ onBack, onHome, onLogout }) {
    const [user, setUser] = useState(null);
    const [name, setName] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [activeSection, setActiveSection] = useState("profile");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getProfile().then((result) => {
            setUser(result.user);
            setName(result.user.name || "");
        }).catch(() => setError("Unable to load account details."));
    }, []);

    const memberSince = useMemo(() => user?.created_at ? new Date(user.created_at).toLocaleDateString("en", { month: "long", year: "numeric" }) : "—", [user]);
    const clearFeedback = () => { setMessage(""); setError(""); };

    const saveProfile = async (event) => {
        event.preventDefault(); clearFeedback(); setSaving(true);
        try {
            const result = await updateProfile(name);
            setUser(result.user); setMessage(result.message);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Unable to update your profile.");
        } finally { setSaving(false); }
    };

    const submitPassword = async (event) => {
        event.preventDefault(); clearFeedback(); setSaving(true);
        try {
            const result = await changePassword(currentPassword, newPassword);
            setMessage(result.message); setCurrentPassword(""); setNewPassword("");
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Unable to change password.");
        } finally { setSaving(false); }
    };

    return (
        <main className="account-page">
            <header className="account-header">
                <button type="button" className="account-brand" onClick={onHome}>LUXTRACK</button>
                <div className="account-heading"><span>ACCOUNT CENTRE</span><h1>Profile &amp; settings</h1><p>A considered space for your identity, security, and preferences.</p></div>
                <div className="account-actions"><button type="button" onClick={onBack}>Back to workspace</button><button type="button" className="account-logout" onClick={() => { logout(); onLogout(); }}>Log out</button></div>
            </header>
            <div className="account-layout">
                <aside className="account-sidebar">
                    <div className="account-avatar">{initials(user?.name)}</div><h2>{user?.name || "Loading profile"}</h2><p>{user?.email || " "}</p>
                    <nav aria-label="Account sections"><button className={activeSection === "profile" ? "active" : ""} onClick={() => { setActiveSection("profile"); clearFeedback(); }}>Profile details <b>›</b></button><button className={activeSection === "security" ? "active" : ""} onClick={() => { setActiveSection("security"); clearFeedback(); }}>Security <b>›</b></button></nav>
                    <div className="account-member"><span>MEMBER SINCE</span><strong>{memberSince}</strong><small>{user?.role || "Member"}</small></div>
                </aside>
                <section className="account-content">
                    {activeSection === "profile" ? <form className="account-panel" onSubmit={saveProfile}><div className="panel-heading"><div><span>PROFILE DETAILS</span><h2>Your identity</h2><p>Keep your account information current.</p></div><div className="panel-icon">✦</div></div><label>Display name<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required /></label><label>Email address<input value={user?.email || ""} readOnly disabled /></label><p className="field-note">Your email is used for secure sign-in and notifications.</p>{error && <p className="account-error">{error}</p>}{message && <p className="account-message">{message}</p>}<button className="account-submit" disabled={saving} type="submit">{saving ? "Saving…" : "Save profile"}</button></form> : <form className="account-panel" onSubmit={submitPassword}><div className="panel-heading"><div><span>SECURITY</span><h2>Protect your account</h2><p>Use a unique password of at least six characters.</p></div><div className="panel-icon">⌁</div></div><label>Current password<input type="password" minLength={6} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label><label>New password<input type="password" minLength={6} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>{error && <p className="account-error">{error}</p>}{message && <p className="account-message">{message}</p>}<button className="account-submit" disabled={saving} type="submit">{saving ? "Updating…" : "Update password"}</button></form>}
                    <div className="account-security-note"><strong>Private by design.</strong><span>LuxTrack never displays or stores your password in plain text.</span></div>
                </section>
            </div>
        </main>
    );
}

export default AccountPage;
