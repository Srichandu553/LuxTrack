import { useEffect, useState } from "react";

import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminPriceReviews from "./pages/AdminPriceReviews.jsx";
import AssetManagement from "./pages/AssetManagement.jsx";
import AssetDetails from "./pages/AssetDetails.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import TrackingPage from "./pages/TrackingPage.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import { getAuthToken } from "./services/authService.js";


function App() {

    const [currentPage, setCurrentPage] =
        useState("dashboard");

    const [selectedAssetId, setSelectedAssetId] =
        useState(null);

    const [authenticated, setAuthenticated] =
        useState(Boolean(getAuthToken()));

    const [publicPage, setPublicPage] = useState("landing");
    const [postLoginPage, setPostLoginPage] = useState("dashboard");

    useEffect(() => {
        const handleAuthExpired = () => {
            setAuthenticated(false);
            setPublicPage("login");
            setPostLoginPage("dashboard");
        };
        window.addEventListener("luxtrack:auth-expired", handleAuthExpired);
        return () => window.removeEventListener("luxtrack:auth-expired", handleAuthExpired);
    }, []);

    if (publicPage === "landing") {
        return (
            <LandingPage
                authenticated={authenticated}
                onLogin={() => {
                    setPostLoginPage("dashboard");
                    setPublicPage("login");
                }}
                onRegister={() => {
                    setPostLoginPage("dashboard");
                    setPublicPage("register");
                }}
                onExplore={() => {
                    if (authenticated) {
                        setCurrentPage("asset-management");
                        setPublicPage("app");
                    } else {
                        setPostLoginPage("asset-management");
                        setPublicPage("login");
                    }
                }}
                onDashboard={() => {
                    setCurrentPage("dashboard");
                    setPublicPage("app");
                }}
            />
        );
    }

    if (!authenticated) {
        if (publicPage === "login" || publicPage === "register") {
            return (
                <AdminLogin
                    initialMode={publicPage}
                    onBack={() => setPublicPage("landing")}
                    onLogin={() => {
                        setAuthenticated(true);
                        setCurrentPage(postLoginPage);
                    }}
                />
            );
        }

        return null;
    }

    /*
     * Select an asset and navigate to details
     */
    const handleSelectAsset = (assetId) => {
        setSelectedAssetId(assetId);
        setCurrentPage("asset-details");
    };


    /*
     * =========================================
     * ADMIN DASHBOARD
     * =========================================
     */

    if (
        currentPage === "dashboard"
    ) {

        return (

            <AdminDashboard

                onOpenPriceReviews={() =>
                    setCurrentPage(
                        "price-reviews"
                    )
                }


                onOpenAssetManagement={() =>
                    setCurrentPage(
                        "asset-management"
                    )
                }
                onOpenTracking={() => setCurrentPage("tracking")}
                onOpenAccount={() => setCurrentPage("account")}
                onOpenHome={() => setPublicPage("landing")}

            />

        );

    }


    /*
     * =========================================
     * ASSET MANAGEMENT
     * =========================================
     */

    if (
        currentPage ===
        "asset-management"
    ) {

        return (

            <AssetManagement

                onBack={() =>
                    setCurrentPage(
                        "dashboard"
                    )
                }
                onOpenHome={() => setPublicPage("landing")}

                onSelectAsset={
                    handleSelectAsset
                }

            />

        );

    }


    /*
     * =========================================
     * ASSET DETAILS & PRICE HISTORY
     * =========================================
     */

    if (
        currentPage ===
        "asset-details"
    ) {

        return (

            <AssetDetails

                assetId={
                    selectedAssetId
                }

                onBack={() =>
                    setCurrentPage(
                        "asset-management"
                    )
                }

            />

        );

    }

    if (currentPage === "tracking") {
        return (
            <TrackingPage
                onBack={() => setCurrentPage("asset-management")}
                onHome={() => setPublicPage("landing")}
                onSelectAsset={handleSelectAsset}
            />
        );
    }

    if (currentPage === "account") {
        return <AccountPage onBack={() => setCurrentPage("dashboard")} onHome={() => setPublicPage("landing")} onLogout={() => { setAuthenticated(false); setPublicPage("landing"); }} />;
    }


    /*
     * =========================================
     * PRICE REVIEWS
     * =========================================
     */

    if (
        currentPage ===
        "price-reviews"
    ) {

        return (

            <div>

                <button
                    type="button"
                    className="back-dashboard-button"
                    onClick={() =>
                        setCurrentPage(
                            "dashboard"
                        )
                    }
                >

                    ← Back to Dashboard

                </button>


                <AdminPriceReviews />

            </div>

        );

    }


    /*
     * =========================================
     * FALLBACK
     * =========================================
     */

    return (

        <AdminDashboard

            onOpenPriceReviews={() =>
                setCurrentPage(
                    "price-reviews"
                )
            }


            onOpenAssetManagement={() =>
                setCurrentPage(
                    "asset-management"
                )
            }
            onOpenTracking={() => setCurrentPage("tracking")}
            onOpenAccount={() => setCurrentPage("account")}
            onOpenHome={() => setPublicPage("landing")}

        />

    );

}


export default App;