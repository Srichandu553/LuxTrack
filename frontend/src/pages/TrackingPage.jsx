import { useEffect, useState } from "react";
import {
    createAlert,
    deleteAlert,
    getAlerts,
    getAlertEvents,
    getWatchlist,
    removeFromWatchlist,
    updateAlert
} from "../services/trackingService.js";
import "./TrackingPage.css";

const price = (item) =>
    item.current_price == null
        ? "Price unavailable"
        : `${item.currency || "INR"} ${Number(item.current_price).toLocaleString()}`;

function TrackingPage({ onBack, onHome, onSelectAsset }) {
    const [watchlist, setWatchlist] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [alertAsset, setAlertAsset] = useState(null);
    const [targetPrice, setTargetPrice] = useState("");
    const [condition, setCondition] = useState("below");
    const [editingAlert, setEditingAlert] = useState(null);
    const [actionError, setActionError] = useState("");
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const [watchResult, alertResult, eventResult] = await Promise.all([getWatchlist(), getAlerts(), getAlertEvents()]);
            setWatchlist(watchResult.watchlist || []);
            setAlerts(alertResult.alerts || []);
            setEvents(eventResult.events || []);
        } catch {
            setError("Unable to load your tracking workspace.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, []);

    const saveAlert = async (event) => {
        event.preventDefault();
        const value = Number(targetPrice);
        if (!alertAsset || !Number.isFinite(value) || value <= 0) return;
        setActionError("");
        setSaving(true);
        try {
            await createAlert({ asset_id: alertAsset.asset_id, target_price: value, condition });
            setAlertAsset(null);
            setTargetPrice("");
            setCondition("below");
            await load();
        } catch (requestError) {
            setActionError(requestError.response?.data?.message || "Unable to create this alert.");
        } finally {
            setSaving(false);
        }
    };

    const saveEditedAlert = async (event) => {
        event.preventDefault();
        const value = Number(targetPrice);
        if (!editingAlert || !Number.isFinite(value) || value <= 0) return;
        setActionError("");
        setSaving(true);
        try {
            await updateAlert(editingAlert.id, { target_price: value, condition });
            setEditingAlert(null);
            setTargetPrice("");
            setCondition("below");
            await load();
        } catch (requestError) {
            setActionError(requestError.response?.data?.message || "Unable to update this alert.");
        } finally {
            setSaving(false);
        }
    };

    const toggleAlert = async (alert) => {
        setActionError("");
        try {
            await updateAlert(alert.id, { is_active: !alert.is_active });
            await load();
        } catch (requestError) {
            setActionError(requestError.response?.data?.message || "Unable to update alert status.");
        }
    };

    const removeAlert = async (id) => {
        setActionError("");
        try {
            await deleteAlert(id);
            await load();
        } catch (requestError) {
            setActionError(requestError.response?.data?.message || "Unable to delete this alert.");
        }
    };

    return (
        <main className="tracking-page">
            <header className="tracking-header">
                <div>
                    <button type="button" className="tracking-brand" onClick={onHome}>LUXTRACK</button>
                    <p className="tracking-eyebrow">PERSONAL MONITORING</p>
                    <h1>Your tracking workspace</h1>
                    <p className="tracking-subtitle">Keep the assets you care about close, and get a clear signal when the market reaches your target.</p>
                </div>
                <div className="tracking-actions">
                    <button type="button" onClick={onHome}>Home</button>
                    <button type="button" onClick={onBack}>Browse assets</button>
                </div>
            </header>

            {(error || actionError) && <div className="tracking-error">{error || actionError} <button type="button" onClick={load}>Retry</button></div>}
            {loading ? <div className="tracking-empty">Loading your workspace…</div> : (
                <div className="tracking-grid">
                    <section className="tracking-panel">
                        <div className="tracking-panel-heading"><div><span>WATCHLIST</span><h2>Saved assets</h2></div><strong>{watchlist.length}</strong></div>
                        {watchlist.length === 0 ? <p className="tracking-empty">Save an asset from the catalog to see it here.</p> : watchlist.map((item) => (
                            <article className="tracking-asset" key={item.id}>
                                <div className="tracking-thumb">{item.image_url ? <img src={item.image_url} alt={item.name} /> : "LT"}</div>
                                <div className="tracking-asset-copy"><span>{item.brand}</span><h3>{item.name}</h3><strong>{price(item)}</strong></div>
                                <div className="tracking-asset-actions">
                                    <button type="button" onClick={() => onSelectAsset(item.asset_id)}>View</button>
                                    <button type="button" onClick={() => setAlertAsset(item)}>Alert</button>
                                    <button type="button" onClick={async () => { await removeFromWatchlist(item.asset_id); load(); }}>Remove</button>
                                </div>
                            </article>
                        ))}
                    </section>

                    <section className="tracking-panel">
                        <div className="tracking-panel-heading"><div><span>PRICE ALERTS</span><h2>Target monitoring</h2></div><strong>{alerts.filter((item) => item.is_active).length}</strong></div>
                        {alerts.length === 0 ? <p className="tracking-empty">Create an alert from a saved asset when you want a price target monitored.</p> : alerts.map((alert) => (
                            <article className="tracking-alert" key={alert.id}>
                                <div><span>{alert.brand}</span><h3>{alert.name}</h3><p>Notify at or below <strong>{alert.currency || "INR"} {Number(alert.target_price).toLocaleString()}</strong></p></div>
                                <div className="tracking-alert-actions">
                                    <button type="button" className={alert.is_active ? "is-active" : ""} onClick={() => toggleAlert(alert)}>{alert.is_active ? "Active" : "Paused"}</button>
                                    <button type="button" onClick={() => { setEditingAlert(alert); setTargetPrice(String(alert.target_price)); setCondition(alert.condition || "below"); }}>Edit</button>
                                    <button type="button" onClick={() => removeAlert(alert.id)}>Delete</button>
                                </div>
                            </article>
                        ))}
                    </section>
                </div>
            )}
            {!loading && events.length > 0 && (
                <section className="tracking-panel tracking-history-panel">
                    <div className="tracking-panel-heading"><div><span>ALERT HISTORY</span><h2>Triggered notifications</h2></div><strong>{events.length}</strong></div>
                    {events.slice(0, 8).map((event) => (
                        <article className="tracking-alert" key={event.id}>
                            <div><span>{event.brand}</span><h3>{event.name}</h3><p>Reached {event.currency || "INR"} {Number(event.price).toLocaleString()} · {event.notification_status}</p></div>
                            <time>{new Date(event.triggered_at).toLocaleDateString()}</time>
                        </article>
                    ))}
                </section>
            )}

            {(alertAsset || editingAlert) && <div className="tracking-modal-backdrop"><form className="tracking-modal" onSubmit={editingAlert ? saveEditedAlert : saveAlert}><button type="button" className="tracking-modal-close" onClick={() => { setAlertAsset(null); setEditingAlert(null); setActionError(""); }}>×</button><span>{editingAlert ? "EDIT PRICE ALERT" : "NEW PRICE ALERT"}</span><h2>{(editingAlert || alertAsset).name}</h2><p>Choose the price and direction that should trigger your notification.</p><label>Condition<select value={condition} onChange={(event) => setCondition(event.target.value)}><option value="below">At or below</option><option value="above">At or above</option></select></label><label>Target price<input type="number" min="1" value={targetPrice} onChange={(event) => setTargetPrice(event.target.value)} required /></label>{actionError && <p className="tracking-error">{actionError}</p>}<button className="tracking-submit" disabled={saving} type="submit">{saving ? "Saving…" : editingAlert ? "Save alert" : "Create alert"}</button></form></div>}
        </main>
    );
}

export default TrackingPage;
