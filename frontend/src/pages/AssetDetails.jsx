import { useEffect, useMemo, useState } from "react";
import { getAssetById, getAssetAIAnalysis } from "../services/assetService.js";
import "./AssetDetails.css";

function AssetDetails({ assetId, onBack }) {
    const [asset, setAsset] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [timeframe, setTimeframe] = useState("ALL");
    const [hoveredPoint, setHoveredPoint] = useState(null);

    // AI Analysis state
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [aiLoading, setAiLoading] = useState(true);
    const [aiError, setAiError] = useState("");

    /*
     * Load asset details
     */
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!assetId) {
            setError("No asset ID provided.");
            setLoading(false);
            return;
        }

        const fetchAsset = async () => {
            try {
                setLoading(true);
                setError("");
                const response = await getAssetById(assetId);

                if (response && response.asset) {
                    setAsset(response.asset);
                } else {
                    setError("Asset details not found.");
                }
            } catch (err) {
                console.error("Failed to fetch asset details:", err);
                setError(
                    err.response?.data?.message ||
                    "Unable to load asset details from LuxTrack API."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchAsset();
    }, [assetId]);
    /* eslint-enable react-hooks/set-state-in-effect */

    /*
     * Load AI Price Analysis
     */
    const loadAIAnalysis = async (id) => {
        try {
            setAiLoading(true);
            setAiError("");
            const response = await getAssetAIAnalysis(id);
            if (response && response.success) {
                setAiAnalysis(response);
            } else {
                setAiError("AI analysis returned an unexpected response.");
            }
        } catch (err) {
            console.error("Failed to fetch AI price analysis:", err);
            setAiError(
                err.response?.data?.message ||
                "Failed to generate live AI price analysis."
            );
        } finally {
            setAiLoading(false);
        }
    };

    useEffect(() => {
        if (assetId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            loadAIAnalysis(assetId);
        }
    }, [assetId]);

    /*
     * Price Formatter (INR)
     */
    const formatPrice = (price, currency = "INR") => {
        const value = Number(price);
        if (!Number.isFinite(value)) return "Price unavailable";

        if (currency === "INR") {
            return new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0
            }).format(value);
        }

        return `${currency} ${value.toLocaleString()}`;
    };

    /*
     * Compact Price Formatter (Crore / Lakh)
     */
    const formatCompactPrice = (price) => {
        const val = Number(price);
        if (!Number.isFinite(val)) return "₹0";

        if (val >= 10000000) {
            const cr = (val / 10000000).toFixed(2);
            return `₹${cr.replace(/\.00$/, "")} Cr`;
        }
        if (val >= 100000) {
            const lakh = (val / 100000).toFixed(2);
            return `₹${lakh.replace(/\.00$/, "")} L`;
        }
        return `₹${val.toLocaleString("en-IN")}`;
    };

    /*
     * Date Formatter
     */
    const formatDate = (dateString, includeTime = false) => {
        if (!dateString) return "Not available";
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return "Not available";

        const options = {
            day: "2-digit",
            month: "short",
            year: "numeric"
        };

        if (includeTime) {
            options.hour = "2-digit";
            options.minute = "2-digit";
        }

        return date.toLocaleDateString("en-IN", options);
    };

    /*
     * Price History Analytics (Full dataset)
     */
    const historyData = useMemo(() => {
        if (!asset || !Array.isArray(asset.price_history) || asset.price_history.length === 0) {
            return [];
        }

        return asset.price_history
            .map((item) => ({
                id: item.id,
                price: Number(item.price),
                currency: item.currency || "INR",
                source: item.source || "Market",
                recordedAt: item.recorded_at,
                timestamp: new Date(item.recorded_at).getTime()
            }))
            .filter((item) => Number.isFinite(item.price) && !Number.isNaN(item.timestamp))
            .sort((a, b) => a.timestamp - b.timestamp);
    }, [asset]);

    /*
     * Timeframe Filtering (1M / 3M / 6M / 1Y / ALL)
     */
    const filteredHistoryData = useMemo(() => {
        if (historyData.length === 0) return [];
        if (timeframe === "ALL") return historyData;

        const latestTs = historyData[historyData.length - 1].timestamp;
        let durationMs = 0;

        if (timeframe === "1M") durationMs = 30 * 24 * 3600 * 1000;
        else if (timeframe === "3M") durationMs = 90 * 24 * 3600 * 1000;
        else if (timeframe === "6M") durationMs = 180 * 24 * 3600 * 1000;
        else if (timeframe === "1Y") durationMs = 365 * 24 * 3600 * 1000;

        const cutoff = latestTs - durationMs;
        const filtered = historyData.filter((item) => item.timestamp >= cutoff);

        // Ensure at least 2 points to render a meaningful line chart if available
        if (filtered.length < 2 && historyData.length >= 2) {
            return historyData.slice(-2);
        }

        return filtered.length > 0 ? filtered : historyData;
    }, [historyData, timeframe]);

    /*
     * Overall Lifetime Stats
     */
    const lifetimeStats = useMemo(() => {
        if (historyData.length === 0) {
            const current = Number(asset?.current_price) || 0;
            return {
                currentPrice: current,
                firstPrice: current,
                minPrice: current,
                maxPrice: current,
                changeAmount: 0,
                changePercentage: 0,
                isPositive: true,
                count: 0
            };
        }

        const prices = historyData.map((d) => d.price);
        const firstPrice = prices[0];
        const currentPrice = Number(asset?.current_price) || prices[prices.length - 1];
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const changeAmount = currentPrice - firstPrice;
        const changePercentage = firstPrice > 0 ? ((changeAmount / firstPrice) * 100) : 0;

        return {
            currentPrice,
            firstPrice,
            minPrice,
            maxPrice,
            changeAmount,
            changePercentage: Number(changePercentage.toFixed(2)),
            isPositive: changeAmount >= 0,
            count: historyData.length
        };
    }, [asset, historyData]);

    /*
     * Timeframe-Specific Trend Metrics
     */
    const timeframeStats = useMemo(() => {
        const data = filteredHistoryData;
        if (data.length === 0) {
            return {
                startPrice: 0,
                endPrice: 0,
                changeAmount: 0,
                changePercentage: 0,
                trend: "Stable",
                trendType: "neutral",
                minPrice: 0,
                maxPrice: 0
            };
        }

        const prices = data.map((d) => d.price);
        const startPrice = prices[0];
        const endPrice = prices[prices.length - 1];
        const changeAmount = endPrice - startPrice;
        const changePercentage = startPrice > 0 ? ((changeAmount / startPrice) * 100) : 0;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        let trend = "Consolidating / Neutral";
        let trendType = "neutral";

        if (changePercentage >= 1) {
            trend = "Bullish / Upward";
            trendType = "positive";
        } else if (changePercentage <= -1) {
            trend = "Bearish / Downward";
            trendType = "negative";
        }

        return {
            startPrice,
            endPrice,
            changeAmount,
            changePercentage: Number(changePercentage.toFixed(2)),
            trend,
            trendType,
            minPrice,
            maxPrice
        };
    }, [filteredHistoryData]);

    /*
     * Interactive Chart Calculations (SVG)
     */
    const chartConfig = useMemo(() => {
        const width = 800;
        const height = 320;
        const padding = { top: 30, right: 30, bottom: 45, left: 80 };

        if (filteredHistoryData.length === 0) {
            return { points: [], width, height, padding, yTicks: [], pathD: "", areaD: "" };
        }

        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        const prices = filteredHistoryData.map((d) => d.price);
        let minP = Math.min(...prices);
        let maxP = Math.max(...prices);

        if (minP === maxP) {
            minP = minP * 0.95;
            maxP = maxP * 1.05;
        } else {
            const buffer = (maxP - minP) * 0.12;
            minP = Math.max(0, minP - buffer);
            maxP = maxP + buffer;
        }

        // Calculate Y ticks
        const yTicksCount = 4;
        const yTicks = [];
        for (let i = 0; i <= yTicksCount; i++) {
            const val = minP + ((maxP - minP) * i) / yTicksCount;
            const y = height - padding.bottom - (i / yTicksCount) * chartHeight;
            yTicks.push({ val, y });
        }

        // Calculate points
        const points = filteredHistoryData.map((d, index) => {
            const x =
                filteredHistoryData.length === 1
                    ? padding.left + chartWidth / 2
                    : padding.left + (index / (filteredHistoryData.length - 1)) * chartWidth;

            const y =
                height -
                padding.bottom -
                ((d.price - minP) / (maxP - minP)) * chartHeight;

            return {
                ...d,
                x,
                y,
                index
            };
        });

        // Path generator
        let pathD = "";
        let areaD = "";

        if (points.length === 1) {
            const p = points[0];
            pathD = `M ${padding.left} ${p.y} L ${width - padding.right} ${p.y}`;
            areaD = `M ${padding.left} ${p.y} L ${width - padding.right} ${p.y} L ${width - padding.right} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;
        } else if (points.length > 1) {
            pathD = `M ${points[0].x} ${points[0].y}`;
            for (let i = 1; i < points.length; i++) {
                const prev = points[i - 1];
                const curr = points[i];
                const cx = (prev.x + curr.x) / 2;
                pathD += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
            }

            const lastPoint = points[points.length - 1];
            const firstPoint = points[0];
            const groundY = height - padding.bottom;
            areaD = `${pathD} L ${lastPoint.x} ${groundY} L ${firstPoint.x} ${groundY} Z`;
        }

        return {
            points,
            width,
            height,
            padding,
            yTicks,
            pathD,
            areaD
        };
    }, [filteredHistoryData]);

    if (loading) {
        return (
            <div className="asset-details-page">
                <div className="details-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading asset specifications and price history...</p>
                </div>
            </div>
        );
    }

    if (error || !asset) {
        return (
            <div className="asset-details-page">
                <div className="details-error-card">
                    <p className="error-badge">Error</p>
                    <h2>Failed to load asset details</h2>
                    <p>{error || "Asset not found."}</p>
                    <button type="button" className="details-back-button" onClick={onBack}>
                        ← Back to Asset Management
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="asset-details-page">
            {/* Top Navigation */}
            <header className="details-header">
                <div>
                    <span className="details-eyebrow">LUXTRACK / ASSET DETAILS</span>
                    <h1 className="details-title">{asset.name}</h1>
                    <p className="details-subtitle">
                        {asset.brand} {asset.model ? `• ${asset.model}` : ""}
                        <span className="details-category-tag">{asset.category}</span>
                    </p>
                </div>

                <button type="button" className="details-back-button" onClick={onBack}>
                    <span>←</span> Back to Asset Management
                </button>
            </header>

            {/* Step 2: Asset Details Profile Overview */}
            <section className="details-overview-grid">
                {/* Left: Product Image Card */}
                <div className="details-image-card">
                    <div className={`details-image-container ${asset.image_url ? "" : "asset-image-fallback"}`}>
                        {asset.image_url ? (
                            <img
                                src={asset.image_url}
                                alt={asset.name}
                                className="details-image"
                                onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    e.currentTarget.parentElement.classList.add("asset-image-fallback");
                                }}
                            />
                        ) : (
                            <div className="details-image-placeholder">
                                Image unavailable
                            </div>
                        )}
                        {asset.rarity && (
                            <span className="details-rarity-badge">{asset.rarity} Rarity</span>
                        )}
                    </div>
                </div>

                {/* Right: Primary Metrics & Specifications */}
                <div className="details-spec-card">
                    <div className="spec-price-header">
                        <div>
                            <span className="spec-label">Current Market Price</span>
                            <div className="spec-main-price">
                                {formatPrice(asset.current_price, asset.currency)}
                            </div>
                        </div>

                        <div className={`spec-growth-pill ${lifetimeStats.isPositive ? "positive" : "negative"}`}>
                            {lifetimeStats.isPositive ? "▲" : "▼"} {Math.abs(lifetimeStats.changePercentage)}%
                        </div>
                    </div>

                    <p className="details-description">
                        {asset.description || "No description provided for this luxury asset."}
                    </p>

                    <div className="spec-grid">
                        <div className="spec-item">
                            <span className="spec-label">Category</span>
                            <strong>{asset.category || "N/A"}</strong>
                        </div>
                        <div className="spec-item">
                            <span className="spec-label">Condition</span>
                            <strong>{asset.condition || "N/A"}</strong>
                        </div>
                        <div className="spec-item">
                            <span className="spec-label">Release Year</span>
                            <strong>{asset.release_year || "N/A"}</strong>
                        </div>
                        <div className="spec-item">
                            <span className="spec-label">Price Source</span>
                            <strong className="source-link-text">{asset.price_source || "Not specified"}</strong>
                        </div>
                        <div className="spec-item">
                            <span className="spec-label">Price Type</span>
                            <strong>{asset.price_type || "Market Reference"}</strong>
                        </div>
                        <div className="spec-item">
                            <span className="spec-label">Last Updated</span>
                            <strong>{formatDate(asset.last_price_update, true)}</strong>
                        </div>
                    </div>
                </div>
            </section>

            {/* Performance KPI Strip */}
            <section className="details-kpi-strip">
                <div className="kpi-card">
                    <span className="kpi-label">TOTAL APPRECIATION</span>
                    <strong className={lifetimeStats.isPositive ? "price-up" : "price-down"}>
                        {lifetimeStats.isPositive ? "+" : ""}{formatPrice(lifetimeStats.changeAmount, asset.currency)}
                    </strong>
                    <span className="kpi-sub">
                        {lifetimeStats.isPositive ? "+" : ""}{lifetimeStats.changePercentage}% since inception
                    </span>
                </div>

                <div className="kpi-card">
                    <span className="kpi-label">ALL-TIME HIGH</span>
                    <strong className="price-highlight">
                        {formatPrice(lifetimeStats.maxPrice, asset.currency)}
                    </strong>
                    <span className="kpi-sub">Peak recorded value</span>
                </div>

                <div className="kpi-card">
                    <span className="kpi-label">ALL-TIME LOW</span>
                    <strong className="price-muted">
                        {formatPrice(lifetimeStats.minPrice, asset.currency)}
                    </strong>
                    <span className="kpi-sub">Floor recorded value</span>
                </div>

                <div className="kpi-card">
                    <span className="kpi-label">PRICE SNAPSHOTS</span>
                    <strong>{lifetimeStats.count}</strong>
                    <span className="kpi-sub">PostgreSQL historical points</span>
                </div>
            </section>

            {/* =========================================
                Step 3: AI Price Analysis Section
            ========================================== */}
            <section className="details-ai-card">
                <div className="ai-card-header">
                    <div className="ai-header-info">
                        <div className="ai-title-row">
                            <span className="ai-badge">🤖 AI VALUATION INTELLIGENCE</span>
                            {aiAnalysis?.ai?.source && (
                                <span className="ai-source-tag">{aiAnalysis.ai.source}</span>
                            )}
                        </div>
                        <h2>AI Fair Price & Valuation Analysis</h2>
                        <p className="ai-sub">
                            Comprehensive valuation metrics, collector sentiment, and fair price benchmark
                        </p>
                    </div>

                    <button
                        type="button"
                        className="ai-refresh-button"
                        onClick={() => loadAIAnalysis(asset.id)}
                        disabled={aiLoading}
                        title="Re-run AI Valuation Model"
                    >
                        <span>{aiLoading ? "⏳" : "⚡"}</span>
                        {aiLoading ? "Analyzing..." : "Re-analyze with AI"}
                    </button>
                </div>

                {aiLoading ? (
                    <div className="ai-loading-container">
                        <div className="ai-pulsing-loader"></div>
                        <p>Synthesizing historical trajectories & evaluating fair price with AI...</p>
                    </div>
                ) : aiError ? (
                    <div className="ai-error-box">
                        <span>{aiError}</span>
                        <button type="button" onClick={() => loadAIAnalysis(asset.id)}>
                            Retry Analysis
                        </button>
                    </div>
                ) : aiAnalysis ? (
                    <div className="ai-analysis-content">
                        {/* AI Core Metrics Strip */}
                        <div className="ai-metrics-grid">
                            {/* Fair Price */}
                            <div className="ai-metric-item">
                                <span className="ai-metric-label">ESTIMATED FAIR VALUE</span>
                                <div className="ai-metric-val fair-price-val">
                                    {formatPrice(aiAnalysis.valuation.fairPrice, asset.currency)}
                                </div>
                                <span className="ai-metric-sub">
                                    {aiAnalysis.valuation.deviationPercent >= 0 ? "+" : ""}
                                    {aiAnalysis.valuation.deviationPercent}% vs Current
                                </span>
                            </div>

                            {/* Valuation Verdict */}
                            <div className="ai-metric-item">
                                <span className="ai-metric-label">VALUATION STATUS</span>
                                <div className={`valuation-status-pill ${aiAnalysis.valuation.valuationStatus}`}>
                                    {aiAnalysis.valuation.valuationLabel}
                                </div>
                                <span className="ai-metric-sub">
                                    {aiAnalysis.valuation.valuationStatus === "undervalued"
                                        ? "Trading below fair price"
                                        : aiAnalysis.valuation.valuationStatus === "overvalued"
                                        ? "Trading with premium"
                                        : "In market equilibrium"}
                                </span>
                            </div>

                            {/* Deal Score */}
                            <div className="ai-metric-item">
                                <span className="ai-metric-label">DEAL / VALUE SCORE</span>
                                <div className="deal-score-display">
                                    <strong>{aiAnalysis.valuation.dealScore}</strong>
                                    <span>/ 10</span>
                                </div>
                                <div className="deal-score-bar">
                                    <div
                                        className="deal-score-fill"
                                        style={{ width: `${aiAnalysis.valuation.dealScore * 10}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Recommendation */}
                            <div className="ai-metric-item">
                                <span className="ai-metric-label">RECOMMENDATION</span>
                                <div className="recommendation-badge">
                                    {aiAnalysis.ai.recommendation}
                                </div>
                                <span className="ai-metric-sub">
                                    Sentiment: {aiAnalysis.ai.marketSentiment}
                                </span>
                            </div>
                        </div>

                        {/* AI Executive Summary */}
                        <div className="ai-summary-box">
                            <span className="ai-summary-label">EXECUTIVE APPRAISAL</span>
                            <p>{aiAnalysis.ai.executiveSummary}</p>
                        </div>

                        {/* Outlook & Drivers Split */}
                        <div className="ai-details-split">
                            {/* Left: Investment Outlook */}
                            <div className="ai-split-panel">
                                <h4>📈 12–24 Month Investment Outlook</h4>
                                <p>{aiAnalysis.ai.investmentOutlook}</p>
                            </div>

                            {/* Right: Key Drivers & Risks */}
                            <div className="ai-split-panel">
                                <h4>💎 Key Valuation Drivers</h4>
                                <div className="ai-tag-list">
                                    {aiAnalysis.ai.keyDrivers.map((driver, idx) => (
                                        <span key={idx} className="ai-driver-tag">
                                            ✓ {driver}
                                        </span>
                                    ))}
                                </div>

                                {aiAnalysis.ai.riskFactors && aiAnalysis.ai.riskFactors.length > 0 && (
                                    <>
                                        <h4 style={{ marginTop: "16px" }}>⚠️ Risk Considerations</h4>
                                        <div className="ai-tag-list">
                                            {aiAnalysis.ai.riskFactors.map((risk, idx) => (
                                                <span key={idx} className="ai-risk-tag">
                                                    ● {risk}
                                                </span>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ) : null}
            </section>

            {/* Price History & Interactive Chart */}
            <section className="details-chart-card">
                <div className="chart-header">
                    <div>
                        <span className="chart-badge">VALUATION INTELLIGENCE</span>
                        <h2>Interactive Price Chart</h2>
                        <p className="chart-sub">
                            Historical price movements and tracking records for {asset.name}
                        </p>
                    </div>

                    <div className="chart-header-actions">
                        {/* Timeframe Selector Tabs */}
                        <div className="timeframe-selector">
                            {["1M", "3M", "6M", "1Y", "ALL"].map((tf) => (
                                <button
                                    key={tf}
                                    type="button"
                                    className={`timeframe-button ${timeframe === tf ? "active" : ""}`}
                                    onClick={() => setTimeframe(tf)}
                                >
                                    {tf}
                                </button>
                            ))}
                        </div>

                        {/* Dynamic Trend Indicator */}
                        <div className={`trend-indicator-badge ${timeframeStats.trendType}`}>
                            <span className="trend-icon">
                                {timeframeStats.trendType === "positive" ? "▲" : timeframeStats.trendType === "negative" ? "▼" : "●"}
                            </span>
                            <span>{timeframeStats.trend}: {timeframeStats.changePercentage >= 0 ? "+" : ""}{timeframeStats.changePercentage}%</span>
                        </div>
                    </div>
                </div>

                {hoveredPoint && (
                    <div className="chart-hover-preview-floating">
                        <span className="hover-date">{formatDate(hoveredPoint.recordedAt, true)}</span>
                        <strong className="hover-price">
                            {formatPrice(hoveredPoint.price, hoveredPoint.currency)}
                        </strong>
                        <span className="hover-source">Source: {hoveredPoint.source}</span>
                    </div>
                )}

                <div className="chart-container">
                    {filteredHistoryData.length === 0 ? (
                        <div className="no-chart-data">
                            <p>No historical price points recorded yet for this asset.</p>
                        </div>
                    ) : (
                        <div className="svg-wrapper">
                            <svg
                                viewBox={`0 0 ${chartConfig.width} ${chartConfig.height}`}
                                className="price-chart-svg"
                                preserveAspectRatio="none"
                            >
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#23d6a0" stopOpacity="0.35" />
                                        <stop offset="100%" stopColor="#23d6a0" stopOpacity="0.0" />
                                    </linearGradient>
                                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#5f9ff5" />
                                        <stop offset="100%" stopColor="#23d6a0" />
                                    </linearGradient>
                                </defs>

                                {/* Y-Axis Grid Lines & Labels */}
                                {chartConfig.yTicks.map((tick, idx) => (
                                    <g key={idx} className="chart-grid-group">
                                        <line
                                            x1={chartConfig.padding.left}
                                            y1={tick.y}
                                            x2={chartConfig.width - chartConfig.padding.right}
                                            y2={tick.y}
                                            className="chart-grid-line"
                                        />
                                        <text
                                            x={chartConfig.padding.left - 12}
                                            y={tick.y + 4}
                                            className="chart-axis-label"
                                            textAnchor="end"
                                        >
                                            {formatCompactPrice(tick.val)}
                                        </text>
                                    </g>
                                ))}

                                {/* Area Fill Under Curve */}
                                {chartConfig.areaD && (
                                    <path
                                        d={chartConfig.areaD}
                                        fill="url(#chartGradient)"
                                        className="chart-area"
                                    />
                                )}

                                {/* Main Line Curve */}
                                {chartConfig.pathD && (
                                    <path
                                        d={chartConfig.pathD}
                                        fill="none"
                                        stroke="url(#lineGradient)"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="chart-line"
                                    />
                                )}

                                {/* Hover Vertical Guide Line */}
                                {hoveredPoint && (
                                    <line
                                        x1={hoveredPoint.x}
                                        y1={chartConfig.padding.top}
                                        x2={hoveredPoint.x}
                                        y2={chartConfig.height - chartConfig.padding.bottom}
                                        className="chart-hover-guide"
                                    />
                                )}

                                {/* Data Point Circles */}
                                {chartConfig.points.map((pt, idx) => {
                                    const isHovered = hoveredPoint?.id === pt.id;
                                    return (
                                        <g
                                            key={pt.id || idx}
                                            className="chart-point-group"
                                            onMouseEnter={() => setHoveredPoint(pt)}
                                            onMouseLeave={() => setHoveredPoint(null)}
                                        >
                                            {/* Hit target area */}
                                            <circle
                                                cx={pt.x}
                                                cy={pt.y}
                                                r="18"
                                                fill="transparent"
                                                className="chart-hitbox"
                                            />
                                            {/* Outer Halo */}
                                            <circle
                                                cx={pt.x}
                                                cy={pt.y}
                                                r={isHovered ? 8 : 4.5}
                                                className={`chart-point-outer ${isHovered ? "active" : ""}`}
                                            />
                                            {/* Inner Solid Dot */}
                                            <circle
                                                cx={pt.x}
                                                cy={pt.y}
                                                r={isHovered ? 4 : 2.5}
                                                className="chart-point-inner"
                                            />
                                        </g>
                                    );
                                })}

                                {/* X-Axis Date Labels */}
                                {chartConfig.points.map((pt, idx) => {
                                    const total = chartConfig.points.length;
                                    const shouldShow =
                                        idx === 0 ||
                                        idx === total - 1 ||
                                        (total > 4 && idx === Math.floor(total / 2));

                                    if (!shouldShow) return null;

                                    return (
                                        <text
                                            key={idx}
                                            x={pt.x}
                                            y={chartConfig.height - 12}
                                            className="chart-date-label"
                                            textAnchor={idx === 0 ? "start" : idx === total - 1 ? "end" : "middle"}
                                        >
                                            {formatDate(pt.recordedAt)}
                                        </text>
                                    );
                                })}
                            </svg>
                        </div>
                    )}
                </div>
            </section>

            {/* Price History PostgreSQL Audit Logs */}
            <section className="details-history-table-card">
                <div className="table-header">
                    <div>
                        <h3>PostgreSQL Price History Logs</h3>
                        <p className="table-subtitle">All recorded historical pricing points from connected sources</p>
                    </div>
                    <span className="table-count-tag">{historyData.length} total snapshots</span>
                </div>

                {historyData.length === 0 ? (
                    <div className="table-empty">
                        <p>No price history logs recorded in database.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="price-history-table">
                            <thead>
                                <tr>
                                    <th>Date Recorded</th>
                                    <th>Price</th>
                                    <th>Change vs Prior</th>
                                    <th>Data Source</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historyData.map((item, index) => {
                                    const prevItem = index > 0 ? historyData[index - 1] : null;
                                    const diff = prevItem ? item.price - prevItem.price : 0;
                                    const diffPct = prevItem && prevItem.price > 0 ? ((diff / prevItem.price) * 100).toFixed(1) : null;

                                    return (
                                        <tr
                                            key={item.id}
                                            className={hoveredPoint?.id === item.id ? "row-highlighted" : ""}
                                            onMouseEnter={() => {
                                                const pt = chartConfig.points.find((p) => p.id === item.id);
                                                if (pt) setHoveredPoint(pt);
                                            }}
                                            onMouseLeave={() => setHoveredPoint(null)}
                                        >
                                            <td className="table-date">
                                                {formatDate(item.recordedAt, true)}
                                            </td>
                                            <td className="table-price">
                                                {formatPrice(item.price, item.currency)}
                                            </td>
                                            <td>
                                                {!prevItem ? (
                                                    <span className="diff-baseline">Baseline</span>
                                                ) : diff === 0 ? (
                                                    <span className="diff-neutral">Unchanged</span>
                                                ) : diff > 0 ? (
                                                    <span className="diff-positive">
                                                        +{formatPrice(diff, item.currency)} (+{diffPct}%)
                                                    </span>
                                                ) : (
                                                    <span className="diff-negative">
                                                        {formatPrice(diff, item.currency)} ({diffPct}%)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="table-source">
                                                <span className="source-pill">{item.source}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

export default AssetDetails;
