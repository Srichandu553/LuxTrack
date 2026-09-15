import { useEffect, useMemo, useState } from "react";

import { archiveAsset, createAsset, getAllAssets, getArchivedAssets, getCategories, updateAsset, restoreAsset } from "../services/assetService.js";
import { addToWatchlist, getWatchlist, removeFromWatchlist } from "../services/trackingService.js";

import "./AssetManagement.css";


function AssetManagement({
    onBack,
    onSelectAsset,
    onOpenHome
}) {

    const [assets, setAssets] = useState([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    const [search, setSearch] = useState("");

    const [category, setCategory] = useState("All");
    const [watchlistIds, setWatchlistIds] = useState(new Set());
    const [editor, setEditor] = useState(null);
    const [saving, setSaving] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [sort, setSort] = useState("newest");
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });


    /*
     * Load all assets
     */
    // The loader is intentionally recreated with the current server-side filters.
    /* eslint-disable react-hooks/exhaustive-deps */
    useEffect(() => {

        // eslint-disable-next-line react-hooks/immutability
        loadAssets();
        getWatchlist()
            .then((result) => setWatchlistIds(new Set((result.watchlist || []).map((item) => Number(item.asset_id)))))
            .catch(() => setWatchlistIds(new Set()));
        getCategories()
            .then((result) => setCategoryOptions(result.categories || []))
            .catch(() => setCategoryOptions([]));

    }, [search, category, sort, pagination.page]);
    /* eslint-enable react-hooks/exhaustive-deps */


    const loadAssets = async () => {

        try {

            setLoading(true);
            setError("");

            const result = await getAllAssets({ search, category: category === "All" ? undefined : category, sort, page: pagination.page, limit: 24 });

            if (
                result &&
                Array.isArray(result.assets)
            ) {

                setAssets(result.assets);
                setPagination(result.pagination || { page: 1, totalPages: 1 });

            } else {

                setAssets([]);

            }

        } catch (err) {

            console.error(
                "Failed to load assets:",
                err
            );

            setError(
                "Unable to connect to LuxTrack backend."
            );

        } finally {

            setLoading(false);

        }

    };

    const loadArchived = async () => {
        try {
            setLoading(true);
            setError("");
            const result = await getArchivedAssets();
            setAssets(Array.isArray(result?.assets) ? result.assets : []);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Unable to load archived products.");
        } finally {
            setLoading(false);
        }
    };

    const toggleArchived = () => {
        const next = !showArchived;
        setShowArchived(next);
        if (next) loadArchived();
        else loadAssets();
    };

    const toggleWatchlist = async (assetId) => {
        const saved = watchlistIds.has(Number(assetId));
        if (saved) {
            await removeFromWatchlist(assetId);
            setWatchlistIds((current) => {
                const next = new Set(current);
                next.delete(Number(assetId));
                return next;
            });
        } else {
            await addToWatchlist(assetId);
            setWatchlistIds((current) => new Set(current).add(Number(assetId)));
        }
    };

    const emptyAsset = {
        name: "", brand: "", model: "", description: "", image_url: "",
        current_price: "", currency: "INR", category_id: "1",
        condition: "Excellent", rarity: "Medium", release_year: "",
        price_source: "Admin", price_type: "market"
    };

    const saveAsset = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...editor.form,
                category_id: Number(editor.form.category_id),
                current_price: Number(editor.form.current_price),
                release_year: editor.form.release_year ? Number(editor.form.release_year) : null
            };
            if (!payload.name.trim() || !payload.brand.trim() || !Number.isFinite(payload.current_price) || payload.current_price <= 0) {
                throw new Error("Name, brand and a positive price are required.");
            }
            if (editor.asset) await updateAsset(editor.asset.id, payload);
            else await createAsset(payload);
            setEditor(null);
            await loadAssets();
        } catch (requestError) {
            setError(requestError.response?.data?.message || requestError.message || "Unable to save product.");
        } finally {
            setSaving(false);
        }
    };


    /*
     * Get unique categories
     */
    const categories = useMemo(() => {

        const uniqueCategories = [
            ...new Set(
                assets
                    .map((asset) => asset.category)
                    .filter(Boolean)
            )
        ];

        return [
            "All",
            ...uniqueCategories
        ];

    }, [assets]);


    /*
     * Filter assets
     */
    const filteredAssets = useMemo(() => {

        const searchText =
            search
                .toLowerCase()
                .trim();


        return assets.filter((asset) => {

            const matchesSearch =
                !searchText ||
                asset.name
                    ?.toLowerCase()
                    .includes(searchText) ||
                asset.brand
                    ?.toLowerCase()
                    .includes(searchText) ||
                asset.model
                    ?.toLowerCase()
                    .includes(searchText);


            const matchesCategory =
                category === "All" ||
                asset.category === category;


            return (
                matchesSearch &&
                matchesCategory
            );

        });

    }, [
        assets,
        search,
        category
    ]);


    /*
     * Format currency
     */
    const formatPrice = (
        price,
        currency = "INR"
    ) => {

        const value = Number(price);


        if (!Number.isFinite(value)) {

            return "Price unavailable";

        }


        if (currency === "INR") {

            return new Intl.NumberFormat(
                "en-IN",
                {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0
                }
            ).format(value);

        }


        return `${currency} ${value.toLocaleString()}`;

    };


    /*
     * Format date
     */
    const formatDate = (date) => {

        if (!date) {

            return "Not available";

        }


        const parsedDate = new Date(date);


        if (
            Number.isNaN(
                parsedDate.getTime()
            )
        ) {

            return "Not available";

        }


        return parsedDate.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    };


    /*
     * Loading
     */
    if (loading) {

        return (

            <div className="asset-page">

                <div className="asset-loading">

                    <div>

                        <div className="loading-spinner">
                            <span></span>
                        </div>

                        <p>
                            Loading LuxTrack assets...
                        </p>

                    </div>

                </div>

            </div>

        );

    }


    return (

        <div className="asset-page">


            {/* =====================================
                HEADER
            ====================================== */}

            <header className="asset-header">

                <div>

                    <p className="asset-eyebrow">
                        LUXTRACK
                    </p>

                    <h1>
                        {showArchived ? "Archived Products" : "Asset Management"}
                    </h1>

                    <p className="asset-subtitle">
                        Monitor and manage your luxury asset inventory.
                    </p>

                </div>


                <button
                    type="button"
                    className="asset-back-button"
                    onClick={onBack}
                >

                    <span>
                        ←
                    </span>

                    Back to Dashboard

                </button>
                <button
                    type="button"
                    className="asset-back-button"
                    onClick={onOpenHome}
                >
                    Home
                </button>
                <button type="button" className="asset-back-button asset-create-button" onClick={() => setEditor({ asset: null, form: emptyAsset })}>
                    + Add product
                </button>
                <button type="button" className="asset-back-button" onClick={toggleArchived}>
                    {showArchived ? "Active products" : "Archived products"}
                </button>

            </header>


            {/* =====================================
                ERROR
            ====================================== */}

            {error && (

                <div className="asset-error">

                    <span>
                        {error}
                    </span>

                    <button
                        type="button"
                        onClick={loadAssets}
                    >
                        Retry
                    </button>

                </div>

            )}


            {/* =====================================
                SUMMARY
            ====================================== */}

            <section className="asset-summary">

                <div className="summary-card">

                    <span>
                        TOTAL ASSETS
                    </span>

                    <strong>
                        {assets.length}
                    </strong>

                </div>


                <div className="summary-card">

                    <span>
                        CATEGORIES
                    </span>

                    <strong>
                        {Math.max(
                            categories.length - 1,
                            0
                        )}
                    </strong>

                </div>


                <div className="summary-card">

                    <span>
                        SHOWING
                    </span>

                    <strong>
                        {filteredAssets.length}
                    </strong>

                </div>


                <div className="summary-card">

                    <span>
                        PRICE SOURCES
                    </span>

                    <strong>
                        {
                            new Set(
                                assets
                                    .map(
                                        (asset) =>
                                            asset.price_source
                                    )
                                    .filter(Boolean)
                            ).size
                        }
                    </strong>

                </div>

            </section>

            {pagination.totalPages > 1 && (
                <div className="asset-pagination">
                    <button type="button" disabled={pagination.page <= 1} onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}>← Previous</button>
                    <span>Page {pagination.page} of {pagination.totalPages}</span>
                    <button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}>Next →</button>
                </div>
            )}


            {/* =====================================
                TOOLBAR
            ====================================== */}

            <section className="asset-toolbar">

                <div className="search-wrapper">

                    <span className="search-icon">
                        ⌕
                    </span>

                    <input
                        type="text"
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
                        placeholder="Search assets, brands or models..."
                    />

                    {search && (

                        <button
                            type="button"
                            className="clear-search"
                            onClick={() =>
                                setSearch("")
                            }
                        >
                            ×
                        </button>

                    )}

                </div>


                <select
                    value={category}
                    onChange={(event) =>
                        setCategory(
                            event.target.value
                        )
                    }
                >

                    {categories.map(
                        (item) => (

                            <option
                                key={item}
                                value={item}
                            >
                                {item}
                            </option>

                        )
                    )}

                </select>
                <select value={sort} onChange={(event) => { setSort(event.target.value); setPagination((current) => ({ ...current, page: 1 })); }}>
                    <option value="newest">Newest</option>
                    <option value="updated">Recently updated</option>
                    <option value="price-asc">Price: low to high</option>
                    <option value="price-desc">Price: high to low</option>
                    <option value="name">Name</option>
                </select>

            </section>


            {/* =====================================
                RESULTS INFO
            ====================================== */}

            <div className="asset-results-bar">

                <div>

                    <span className="results-label">
                        LUXTRACK INVENTORY
                    </span>

                    <strong>
                        {filteredAssets.length}{" "}
                        {filteredAssets.length === 1
                            ? "asset"
                            : "assets"}
                    </strong>

                </div>


                {(search ||
                    category !== "All") && (

                    <button
                        type="button"
                        className="clear-filters"
                        onClick={() => {

                            setSearch("");
                            setCategory("All");

                        }}
                    >
                        Clear filters
                    </button>

                )}

            </div>


            {/* =====================================
                ASSET GRID
            ====================================== */}

            <section className="asset-grid">

                {filteredAssets.length === 0 ? (

                    <div className="no-assets">

                        <div className="no-assets-icon">
                            ◇
                        </div>

                        <h2>
                            No assets found
                        </h2>

                        <p>
                            Try changing your search
                            or category filter.
                        </p>

                    </div>

                ) : (

                    filteredAssets.map(
                        (asset) => (

                            <article
                                className="asset-card"
                                key={asset.id}
                            >


                                {/* IMAGE */}

                                <div
                                    className={
                                        `asset-image-container ${
                                            asset.image_url
                                                ? ""
                                                : "asset-image-fallback"
                                        }`
                                    }
                                >

                                    {asset.image_url ? (

                                        <img
                                            src={asset.image_url}
                                            alt={asset.name}
                                            className="asset-image"
                                            onError={(event) => {

                                                event.currentTarget.style.display =
                                                    "none";

                                                event.currentTarget
                                                    .parentElement
                                                    .classList.add(
                                                        "asset-image-fallback"
                                                    );

                                            }}
                                        />

                                    ) : (

                                        <div className="asset-image-placeholder">
                                            Image unavailable
                                        </div>

                                    )}


                                    {asset.rarity && (

                                        <span className="rarity-badge">

                                            {asset.rarity}

                                        </span>

                                    )}
                                    {showArchived && <span className="archived-badge">ARCHIVED</span>}
                                    <button
                                        type="button"
                                        className="asset-watchlist-button"
                                        aria-label={watchlistIds.has(Number(asset.id)) ? "Remove from watchlist" : "Add to watchlist"}
                                        onClick={() => toggleWatchlist(asset.id)}
                                    >
                                        {watchlistIds.has(Number(asset.id)) ? "♥" : "♡"}
                                    </button>

                                </div>


                                {/* CONTENT */}

                                <div className="asset-content">

                                    <p className="asset-category">
                                        {asset.category ||
                                            "Uncategorized"}
                                    </p>


                                    <h2
                                        className="asset-title-clickable"
                                        onClick={() => {
                                            if (onSelectAsset) {
                                                onSelectAsset(asset.id);
                                            }
                                        }}
                                        title={`View details for ${asset.name}`}
                                    >
                                        {asset.name}
                                    </h2>


                                    <p className="asset-model">

                                        {asset.brand ||
                                            "Unknown brand"}

                                        {" • "}

                                        {asset.model ||
                                            "Unknown model"}

                                    </p>


                                    <p className="asset-description">

                                        {asset.description ||
                                            "No description available for this asset."}

                                    </p>


                                    {/* INFORMATION */}

                                    <div className="asset-info">

                                        <div>

                                            <span>
                                                Condition
                                            </span>

                                            <strong>
                                                {asset.condition ||
                                                    "Not available"}
                                            </strong>

                                        </div>


                                        <div>

                                            <span>
                                                Release
                                            </span>

                                            <strong>
                                                {asset.release_year ||
                                                    "Not available"}
                                            </strong>

                                        </div>

                                    </div>


                                    {/* PRICE */}

                                    <div className="asset-price">

                                        <span>
                                            Current Market Price
                                        </span>

                                        <strong>
                                            {formatPrice(
                                                asset.current_price,
                                                asset.currency
                                            )}
                                        </strong>

                                    </div>


                                    {/* SOURCE */}

                                    <div className="asset-source">

                                        <span>
                                            Price Source
                                        </span>

                                        <strong>

                                            {asset.price_source ||
                                                "Not available"}

                                        </strong>

                                    </div>


                                    {/* FOOTER */}

                                    <div className="asset-footer">

                                        <span>

                                            Updated{" "}

                                            {formatDate(
                                                asset.last_price_update
                                            )}

                                        </span>


                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (onSelectAsset) {
                                                    onSelectAsset(asset.id);
                                                }
                                            }}
                                        >
                                            View Details
                                        </button>
                                        {!showArchived && (
                                            <button type="button" onClick={() => setEditor({ asset, form: { ...emptyAsset, ...asset, category_id: asset.category_id || "1", current_price: asset.current_price || "" } })}>
                                                Edit
                                            </button>
                                        )}
                                        {!showArchived && (
                                            <button type="button" onClick={async () => {
                                            if (window.confirm(`Archive ${asset.name}? Its price history will be preserved.`)) {
                                                try { await archiveAsset(asset.id); await loadAssets(); }
                                                catch (requestError) { setError(requestError.response?.data?.message || "Unable to archive product."); }
                                            }
                                            }}>
                                                Archive
                                            </button>
                                        )}
                                        {showArchived && (
                                            <button type="button" onClick={async () => {
                                            try { await restoreAsset(asset.id); await loadArchived(); }
                                            catch (requestError) { setError(requestError.response?.data?.message || "Unable to restore product."); }
                                            }}>Restore</button>
                                        )}

                                    </div>

                                </div>

                            </article>

                        )
                    )

                )}

            </section>

            {editor && (
                <div className="asset-editor-backdrop">
                    <form className="asset-editor" onSubmit={saveAsset}>
                        <div className="asset-editor-heading">
                            <div><span>ADMIN CATALOG</span><h2>{editor.asset ? "Edit product" : "Add product"}</h2></div>
                            <button type="button" onClick={() => setEditor(null)}>×</button>
                        </div>
                        <div className="asset-editor-grid">
                            {[
                                ["name", "Product name"], ["brand", "Brand"], ["model", "Model"],
                                ["current_price", "Current price"], ["currency", "Currency"],
                                ["condition", "Condition"], ["rarity", "Rarity"], ["release_year", "Release year"],
                                ["image_url", "Image URL"], ["price_source", "Price source"]
                            ].map(([key, label]) => (
                                <label key={key} className={key === "image_url" ? "asset-editor-wide" : ""}>{label}
                                    <input value={editor.form[key] ?? ""} type={key === "current_price" || key === "release_year" ? "number" : "text"} onChange={(event) => setEditor((current) => ({ ...current, form: { ...current.form, [key]: event.target.value } }))} required={["name", "brand", "current_price"].includes(key)} />
                                </label>
                            ))}
                            <label>Category
                                <select value={editor.form.category_id ?? ""} onChange={(event) => setEditor((current) => ({ ...current, form: { ...current.form, category_id: event.target.value } }))} required>
                                    <option value="">Select category</option>
                                    {categoryOptions.map((categoryItem) => <option key={categoryItem.id} value={categoryItem.id}>{categoryItem.name}</option>)}
                                </select>
                            </label>
                            <label className="asset-editor-wide">Description<textarea value={editor.form.description ?? ""} onChange={(event) => setEditor((current) => ({ ...current, form: { ...current.form, description: event.target.value } }))} rows="3" /></label>
                        </div>
                        {error && <p className="asset-editor-error">{error}</p>}
                        <div className="asset-editor-actions"><button type="button" onClick={() => setEditor(null)}>Cancel</button><button className="asset-save-button" type="submit" disabled={saving}>{saving ? "Saving…" : "Save product"}</button></div>
                    </form>
                </div>
            )}

        </div>

    );

}


export default AssetManagement;