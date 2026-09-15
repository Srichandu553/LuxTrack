import { useEffect, useState } from "react";
import { getAllAssets } from "../services/assetService.js";
import "./LandingPage.css";

const formatPrice = (asset) => {
    if (asset.current_price == null) return "Price unavailable";
    return `${asset.currency || "INR"} ${Number(asset.current_price).toLocaleString()}`;
};

function LandingPage({ onLogin, onRegister, onExplore, onDashboard, authenticated }) {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAllAssets()
            .then((result) => setAssets(Array.isArray(result?.assets) ? result.assets.slice(0, 3) : []))
            .catch(() => setAssets([]))
            .finally(() => setLoading(false));
    }, []);

    return (
        <main className="landing-page">
            <nav className="landing-nav">
                <button className="landing-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                    LUX<span>TRACK</span>
                </button>
                <div className="landing-nav-links">
                    <button onClick={onExplore}>Explore Assets</button>
                    <a href="#how-it-works">How It Works</a>
                    <a href="#insights">Market Insights</a>
                    <a href="#about">About</a>
                </div>
                <div className="landing-nav-actions">
                    {authenticated && <button className="landing-login" onClick={onDashboard}>Dashboard</button>}
                    <button className="landing-login" onClick={onLogin}>Log in</button>
                    <button className="landing-button landing-button-small" onClick={onRegister}>Get started</button>
                </div>
            </nav>

            <section className="landing-hero">
                <div className="landing-hero-copy">
                    <p className="landing-eyebrow">LUXURY ASSET INTELLIGENCE</p>
                    <h1>Know what your luxury assets are really worth.</h1>
                    <p className="landing-lead">
                        Track market data, historical pricing and valuation signals in one
                        considered workspace built for the assets that matter.
                    </p>
                    <div className="landing-hero-actions">
                        <button className="landing-button" onClick={onExplore}>Explore assets <span>→</span></button>
                        <button className="landing-text-button" onClick={authenticated ? onDashboard : onRegister}>Track your portfolio <span>↗</span></button>
                    </div>
                    <div className="landing-proof">
                        <span className="landing-proof-dot" />
                        <span>Real products. Transparent pricing. Better decisions.</span>
                    </div>
                </div>
                <div className="landing-hero-visual">
                    <div className="landing-visual-glow" />
                    <div className="landing-visual-card landing-visual-card-back" />
                    <div className="landing-visual-card landing-visual-card-front">
                        <div className="landing-visual-top"><span>MARKET VIEW</span><span>↗</span></div>
                        <div className="landing-visual-watch">◒</div>
                        <p>Curated assets</p>
                        <strong>Intelligent valuation</strong>
                        <div className="landing-visual-line"><i /><i /><i /><i /><i /></div>
                    </div>
                </div>
            </section>

            <section className="landing-value-grid" id="about">
                <article><span>01</span><h2>Real market data</h2><p>Keep pricing information and sources together instead of relying on scattered listings.</p></article>
                <article><span>02</span><h2>Historical perspective</h2><p>See how an asset has moved over time and understand the context behind today&apos;s price.</p></article>
                <article><span>03</span><h2>Clear valuation signals</h2><p>Combine asset details and market signals into a more informed view of value.</p></article>
            </section>

            <section className="landing-section" id="how-it-works">
                <div className="landing-section-heading">
                    <p className="landing-eyebrow">A CLEARER VIEW</p>
                    <h2>From discovery to decision.</h2>
                </div>
                <div className="landing-steps">
                    <div><b>01</b><h3>Select an asset</h3><p>Explore watches, cars, jewelry and collectible assets in one catalog.</p></div>
                    <div><b>02</b><h3>Read the market</h3><p>Review price, source, condition and the details that shape an asset&apos;s value.</p></div>
                    <div><b>03</b><h3>Track the trend</h3><p>Use price history and valuation insights to make decisions with more confidence.</p></div>
                </div>
            </section>

            <section className="landing-featured" id="insights">
                <div className="landing-section-heading">
                    <p className="landing-eyebrow">FEATURED ASSETS</p>
                    <h2>Start with what catches your eye.</h2>
                </div>
                {loading && <p className="landing-muted">Loading the catalog…</p>}
                {!loading && assets.length === 0 && <p className="landing-muted">The catalog is unavailable right now. Sign in to explore when it is back online.</p>}
                <div className="landing-assets">
                    {assets.map((asset) => (
                        <article className="landing-asset-card" key={asset.id}>
                            <div className="landing-asset-image">
                                {asset.image_url ? <img src={asset.image_url} alt={asset.name} /> : <span>LT</span>}
                            </div>
                            <div className="landing-asset-info">
                                <p>{asset.brand} · {asset.category || "Luxury asset"}</p>
                                <h3>{asset.name}</h3>
                                <strong>{formatPrice(asset)}</strong>
                            </div>
                        </article>
                    ))}
                </div>
                <button className="landing-outline-button" onClick={onExplore}>View all assets →</button>
            </section>

            <section className="landing-cta">
                <p className="landing-eyebrow">YOUR COLLECTION, IN FOCUS</p>
                <h2>Start tracking what matters.</h2>
                <p>Build a more informed picture of your luxury assets with LuxTrack.</p>
                <button className="landing-button" onClick={onRegister}>Create your account <span>→</span></button>
            </section>

            <footer className="landing-footer">
                <strong>LUX<span>TRACK</span></strong>
                <span>Luxury asset intelligence</span>
                <span>© {new Date().getFullYear()} LuxTrack</span>
            </footer>
        </main>
    );
}

export default LandingPage;
