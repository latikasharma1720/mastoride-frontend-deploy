// src/pages/user/UserDashboard.jsx

import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import MapBlock from "../../components/MapBlock";
import { getUser } from "../../utils/session";
import { useToast } from "../../components/ui-kit";
import { getProfile, saveProfile, getSettings, saveSettings } from "../../utils/data";
const API_BASE = "https://mastoride-web-dev-production-d469.up.railway.app";
const NAV_ITEMS = [
  { id: "profile", label: "Profile", icon: "👤" },
  { id: "book", label: "Book Ride", icon: "🚗" },
  { id: "payment", label: "Payment", icon: "💳" },
  { id: "rewards", label: "Rewards", icon: "🏅" },
  { id: "history", label: "History", icon: "🕘" },
];

const LS_KEYS = {
  ride: "ud_ride_draft",
  tab: "ud_active_tab",
  sidebar: "ud_sidebar_open",
  history: "ud_ride_history",
};

const getDefaultAvailableBadges = () => [
  { id: "welcome", label: "Welcome Rider", earned: true },
  { id: "first-ride", label: "First Ride", earned: false },
  { id: "early-bird", label: "Early Bird", earned: false },
  { id: "night-owl", label: "Night Owl", earned: false },
];

export default function UserDashboard() {
  const { pushToast } = useToast();

  // ---------- AUTH ----------
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // ---------- UI LAYOUT ----------
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem(LS_KEYS.tab) || "profile"
  );
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const raw = localStorage.getItem(LS_KEYS.sidebar);
    return raw == null ? true : raw === "true";
  });

  // ---------- PROFILE + SETTINGS ----------
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    major: "",
    gradYear: "",
    campusId: "",
    address: "",
    bio: "",
  });

  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsAlerts: false,
    rideReminders: true,
    darkMode: false,
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [profileSubTab, setProfileSubTab] = useState("account");

  // ---------- RIDE BOOKING ----------
  const [ride, setRide] = useState(() => {
    const stored = localStorage.getItem(LS_KEYS.ride);
    return (
      (stored && JSON.parse(stored)) || {
        pickup: "",
        dropoff: "",
        date: "",
        time: "",
        passengers: 1,
      }
    );
  });

  const [fare, setFare] = useState(null);
  const [fareEstimated, setFareEstimated] = useState(false);

  // ---------- PAYMENT (PURE FRONT-END) ----------
  const [card, setCard] = useState({
    cardHolder: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  });

  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  // ---------- REWARDS + HISTORY (LOCAL ONLY) ----------
  const [availableBadges, setAvailableBadges] = useState(
    getDefaultAvailableBadges()
  );
  const [rideHistory, setRideHistory] = useState(() => {
    const stored = localStorage.getItem(LS_KEYS.history);
    return stored ? JSON.parse(stored) : [];
  });

  // ---------- AUTH CHECK ----------
  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== "user") {
      setAuthChecked(true);
      return;
    }
    setCurrentUser(u);
    setAuthChecked(true);
  }, []);

  // ---------- LOAD PROFILE / SETTINGS (LOCAL STORAGE) ----------
  useEffect(() => {
    if (!currentUser) return;
    const userId = currentUser.id || currentUser._id || "user-demo";

    const storedProfile = getProfile(userId) || {};
    setProfile({
      name: storedProfile.name || currentUser.name || "",
      email: storedProfile.email || currentUser.email || "",
      phone: storedProfile.phone || "",
      major: storedProfile.major || "",
      gradYear: storedProfile.gradYear || "",
      campusId: storedProfile.campusId || "",
      address: storedProfile.address || "",
      bio: storedProfile.bio || "",
    });

    const storedSettings = getSettings(userId) || {};
    setSettings({
      emailNotifications: storedSettings.emailNotifications ?? true,
      smsAlerts: storedSettings.smsAlerts ?? false,
      rideReminders: storedSettings.rideReminders ?? true,
      darkMode: storedSettings.darkMode ?? false,
    });
  }, [currentUser]);

  // ---------- PERSIST UI STATE ----------
  useEffect(() => {
    localStorage.setItem(LS_KEYS.tab, activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.sidebar, String(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.ride, JSON.stringify(ride));
  }, [ride]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.history, JSON.stringify(rideHistory));
  }, [rideHistory]);

  if (!authChecked) return null;
  if (!currentUser || currentUser.role !== "user") {
    return <Navigate to="/login" replace />;
  }

  // ---------- HANDLERS ----------
  function handleRideChange(e) {
    const { name, value } = e.target;
    setRide((prev) => ({
      ...prev,
      [name]: name === "passengers" ? Number(value) || 1 : value,
    }));
  }

  function handleCardChange(e) {
    const { name, value } = e.target;
    setCard((prev) => ({ ...prev, [name]: value }));
  }

  function handleEstimateFare(e) {
    e.preventDefault();

    if (!ride.pickup || !ride.dropoff || !ride.date || !ride.time) {
      pushToast("Please fill pickup, drop-off, date and time first.", "error");
      return;
    }

    const baseFare = 3.5;
    const distance = Math.floor(Math.random() * 10) + 1; // 1–10 miles
    const total = (baseFare + distance * 1.75) * (ride.passengers || 1);
    setFare(total.toFixed(2));
    setFareEstimated(true);
    pushToast("Fare estimated for your ride.", "success");
    setActiveTab("payment");
  }

  function handleConfirmPayment(e) {
    e.preventDefault();

    if (!fareEstimated || !fare) {
      pushToast("Please estimate the fare before paying.", "error");
      return;
    }

    if (
      !card.cardHolder.trim() ||
      !card.cardNumber.trim() ||
      !card.expiry.trim() ||
      !card.cvv.trim()
    ) {
      pushToast("Please fill in all card details.", "error");
      return;
    }

    setIsSubmittingPayment(true);

    // 🔒 PURE FRONT-END: no fetch, no API calls.
    const booking = {
      id: Date.now(),
      pickup: ride.pickup,
      dropoff: ride.dropoff,
      date: ride.date,
      time: ride.time,
      passengers: ride.passengers,
      fare,
      createdAt: new Date().toISOString(),
    };

    setRideHistory((prev) => [booking, ...prev]);

    setAvailableBadges((prev) =>
      prev.map((b) => (b.id === "first-ride" ? { ...b, earned: true } : b))
    );

    setShowPaymentSuccess(true);
    pushToast("Ride booked successfully!", "success");
    setIsSubmittingPayment(false);
  }

  function closeSuccessModal() {
    setShowPaymentSuccess(false);
    setRide({
      pickup: "",
      dropoff: "",
      date: "",
      time: "",
      passengers: 1,
    });
    setFare(null);
    setFareEstimated(false);
    setCard({
      cardHolder: "",
      cardNumber: "",
      expiry: "",
      cvv: "",
    });
    setActiveTab("history");
  }

  function onProfileChange(e) {
    const { name, value } = e.target;
    setProfile((p) => ({ ...p, [name]: value }));
  }

  function onSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      if (profile.email && !/\S+@\S+\.\S+/.test(profile.email)) {
        pushToast("Please enter a valid email.", "error");
        setSavingProfile(false);
        return;
      }
      const userId = currentUser.id || currentUser._id || "user-demo";
      saveProfile(userId, profile);
      pushToast("Profile saved!", "success");
      setIsEditingProfile(false);
    } catch {
      pushToast("Could not save profile.", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  function onToggleSetting(key) {
    setSettings((s) => ({ ...s, [key]: !s[key] }));
  }

  function onSaveSettings(e) {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const userId = currentUser.id || currentUser._id || "user-demo";
      saveSettings(userId, settings);
      pushToast("Settings saved!", "success");
    } catch {
      pushToast("Could not save settings.", "error");
    } finally {
      setSavingSettings(false);
    }
  }

  // ---------- RENDER ----------
  return (
    <>
      <div className="navbar-fix">
        <Navbar />
      </div>

      <div className={`ud ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <div className="dashboard-layout">
          {/* SIDEBAR */}
          <aside className="sidebar-nav" aria-label="Section navigation">
            <button
              className="sidebar-toggle fancy"
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-expanded={sidebarOpen}
            >
              <span className="hamburger">
                <span className="line top" />
                <span className="line middle" />
                <span className="line bottom" />
              </span>
            </button>
            <nav className="sidebar-tabs">
              {NAV_ITEMS.map(({ id, label, icon }) => (
                <button
                  key={id}
                  className={`sidebar-btn ${activeTab === id ? "active" : ""}`}
                  onClick={() => setActiveTab(id)}
                  aria-label={label}
                  data-tip={label}
                >
                  <span className="sb-icon" aria-hidden="true">
                    {icon}
                  </span>
                  <span className="sb-label">{label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* MAIN CONTENT */}
          <main className="dashboard-main">
            <div className="dashboard-content-wrapper">
              {/* PROFILE TAB */}
              {activeTab === "profile" && (
                <div className="clean-profile-layout">
                  <section className="ud-hero">
                    <h1>Welcome back, {profile.name || "Rider"} 👋</h1>
                    <p>Manage your rider profile and preferences.</p>
                  </section>

                  <div className="profile-main-card profile-wide">
                    <div className="profile-hero">
                      <div className="profile-hero-left">
                        <div className="profile-avatar-large">
                          <span className="avatar-circle-large">
                            {(profile.name || "R").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="profile-hero-info">
                          <h2>{profile.name || "Rider"}</h2>
                          <p>{profile.email || currentUser.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="profile-tabs">
                      {["account", "settings"].map((k) => (
                        <button
                          key={k}
                          className={`profile-tab-btn ${
                            profileSubTab === k ? "active" : ""
                          }`}
                          onClick={() => setProfileSubTab(k)}
                          type="button"
                        >
                          {k === "account" ? "Account" : "Settings"}
                        </button>
                      ))}
                    </div>

                    {profileSubTab === "account" && (
                      <section className="profile-section">
                        <form
                          className="clean-profile-form"
                          onSubmit={onSaveProfile}
                        >
                          <div className="profile-group">
                            <div className="group-title">
                              Basic Information
                            </div>
                            <div className="grid-two">
                              <label className="clean-field">
                                <span>Full Name</span>
                                <input
                                  name="name"
                                  type="text"
                                  placeholder="Your name"
                                  value={profile.name}
                                  onChange={onProfileChange}
                                  disabled={!isEditingProfile}
                                />
                              </label>
                              <label className="clean-field">
                                <span>PFW Email</span>
                                <input
                                  name="email"
                                  type="email"
                                  placeholder="you@pfw.edu"
                                  value={profile.email}
                                  onChange={onProfileChange}
                                  disabled={!isEditingProfile}
                                />
                              </label>
                            </div>
                            <div className="grid-two">
                              <label className="clean-field">
                                <span>Phone</span>
                                <input
                                  name="phone"
                                  type="tel"
                                  placeholder="(260) 555-0123"
                                  value={profile.phone}
                                  onChange={onProfileChange}
                                  disabled={!isEditingProfile}
                                />
                              </label>
                              <label className="clean-field">
                                <span>Campus ID</span>
                                <input
                                  name="campusId"
                                  type="text"
                                  placeholder="Student ID"
                                  value={profile.campusId}
                                  onChange={onProfileChange}
                                  disabled={!isEditingProfile}
                                />
                              </label>
                            </div>
                            <div className="grid-two">
                              <label className="clean-field">
                                <span>Major</span>
                                <input
                                  name="major"
                                  type="text"
                                  value={profile.major}
                                  onChange={onProfileChange}
                                  disabled={!isEditingProfile}
                                />
                              </label>
                              <label className="clean-field">
                                <span>Grad Year</span>
                                <input
                                  name="gradYear"
                                  type="text"
                                  value={profile.gradYear}
                                  onChange={onProfileChange}
                                  disabled={!isEditingProfile}
                                />
                              </label>
                            </div>
                            <label className="clean-field">
                              <span>Address</span>
                              <input
                                name="address"
                                type="text"
                                placeholder="Fort Wayne, IN"
                                value={profile.address}
                                onChange={onProfileChange}
                                disabled={!isEditingProfile}
                              />
                            </label>
                          </div>

                          <div className="profile-group">
                            <div className="group-title">About</div>
                            <label className="clean-field">
                              <span>Bio / Notes</span>
                              <textarea
                                name="bio"
                                rows="3"
                                placeholder="Anything you'd like drivers to know..."
                                value={profile.bio}
                                onChange={onProfileChange}
                                disabled={!isEditingProfile}
                                style={{
                                  width: "100%",
                                  padding: "12px 14px",
                                  border: "1px solid #dedede",
                                  borderRadius: "12px",
                                  fontSize: "14px",
                                  fontFamily: "inherit",
                                  resize: "vertical",
                                  outline: "none",
                                }}
                              />
                            </label>
                          </div>

                          <div className="profile-actions">
                            {!isEditingProfile ? (
                              <button
                                className="btn"
                                type="button"
                                onClick={() => setIsEditingProfile(true)}
                              >
                                Edit Profile
                              </button>
                            ) : (
                              <>
                                <button
                                  className="btn"
                                  type="submit"
                                  disabled={savingProfile}
                                >
                                  {savingProfile ? "Saving..." : "Save Changes"}
                                </button>
                                <button
                                  className="btn ghost"
                                  type="button"
                                  onClick={() => setIsEditingProfile(false)}
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </form>
                      </section>
                    )}

                    {profileSubTab === "settings" && (
                      <section className="profile-section">
                        <form className="ud-form" onSubmit={onSaveSettings}>
                          <div className="setting-item">
                            <div>
                              <strong>Email Notifications</strong>
                              <p>Get email updates about your rides</p>
                            </div>
                            <label className="toggle">
                              <input
                                type="checkbox"
                                checked={settings.emailNotifications}
                                onChange={() =>
                                  onToggleSetting("emailNotifications")
                                }
                              />
                              <span />
                            </label>
                          </div>
                          <div className="setting-item">
                            <div>
                              <strong>SMS Alerts</strong>
                              <p>Receive SMS alerts for driver arrival</p>
                            </div>
                            <label className="toggle">
                              <input
                                type="checkbox"
                                checked={settings.smsAlerts}
                                onChange={() => onToggleSetting("smsAlerts")}
                              />
                              <span />
                            </label>
                          </div>
                          <div className="setting-item">
                            <div>
                              <strong>Ride Reminders</strong>
                              <p>Reminder before scheduled rides</p>
                            </div>
                            <label className="toggle">
                              <input
                                type="checkbox"
                                checked={settings.rideReminders}
                                onChange={() =>
                                  onToggleSetting("rideReminders")
                                }
                              />
                              <span />
                            </label>
                          </div>
                          <button
                            className="btn wide"
                            type="submit"
                            disabled={savingSettings}
                          >
                            {savingSettings ? "Saving..." : "Save Settings"}
                          </button>
                        </form>
                      </section>
                    )}
                  </div>
                </div>
              )}

              {/* BOOK RIDE TAB */}
              {activeTab === "book" && (
                <div className="book-layout">
                  <section className="ud-hero">
                    <h1>Book a Ride 🚗</h1>
                    <p>Choose your pickup and drop-off to get started.</p>
                  </section>

                  <div className="ride-grid">
                    <section className="ud-panel ride-form">
                      <header className="ud-head">
                        <h2>Ride Details</h2>
                        <p>Fill in the details and estimate your fare.</p>
                      </header>

                      <form onSubmit={handleEstimateFare} className="ud-form">
                        <label className="clean-field">
                          <span>Pickup</span>
                          <input
                            name="pickup"
                            type="text"
                            placeholder="e.g. PFW Campus Center"
                            value={ride.pickup}
                            onChange={handleRideChange}
                          />
                        </label>
                        <label className="clean-field">
                          <span>Drop-off</span>
                          <input
                            name="dropoff"
                            type="text"
                            placeholder="e.g. Jefferson Pointe"
                            value={ride.dropoff}
                            onChange={handleRideChange}
                          />
                        </label>

                        <div className="grid-two">
                          <label className="clean-field">
                            <span>Date</span>
                            <input
                              name="date"
                              type="date"
                              value={ride.date}
                              onChange={handleRideChange}
                            />
                          </label>
                          <label className="clean-field">
                            <span>Time</span>
                            <input
                              name="time"
                              type="time"
                              value={ride.time}
                              onChange={handleRideChange}
                            />
                          </label>
                        </div>

                        <label className="clean-field">
                          <span>Passengers</span>
                          <input
                            name="passengers"
                            type="number"
                            min="1"
                            max="4"
                            value={ride.passengers}
                            onChange={handleRideChange}
                          />
                        </label>

                        <button className="btn wide" type="submit">
                          Estimate Fare &amp; Continue
                        </button>
                      </form>
                    </section>

                    <section className="ud-panel">
                      <header className="ud-head">
                        <h2>Map Preview</h2>
                        <p>Approximate route between your locations.</p>
                      </header>
                      <MapBlock
                        pickup={ride.pickup}
                        dropoff={ride.dropoff}
                        height={320}
                      />
                    </section>
                  </div>
                </div>
              )}

              {/* PAYMENT TAB */}
              {activeTab === "payment" && (
                <div className="payment-layout">
                  <section className="ud-hero">
                    <h1>Complete Your Payment 💳</h1>
                    <p>Review your ride details and confirm the booking.</p>
                  </section>

                  <div className="ride-grid">
                    <section className="ud-panel">
                      <header className="ud-head">
                        <h2>Ride Summary</h2>
                      </header>
                      <div className="summary-block">
                        <p>
                          <strong>Pickup:</strong> {ride.pickup || "—"}
                        </p>
                        <p>
                          <strong>Drop-off:</strong> {ride.dropoff || "—"}
                        </p>
                        <p>
                          <strong>Date:</strong> {ride.date || "—"}
                        </p>
                        <p>
                          <strong>Time:</strong> {ride.time || "—"}
                        </p>
                        <p>
                          <strong>Passengers:</strong> {ride.passengers || 1}
                        </p>
                        <p className="fare-line">
                          <strong>Estimated Fare:</strong>{" "}
                          {fare ? `$${fare}` : "Not estimated yet"}
                        </p>
                      </div>
                    </section>

                    <section className="ud-panel">
                      <header className="ud-head">
                        <h2>Card Details</h2>
                        <p>Demo-only — not a real payment.</p>
                      </header>
                      <form onSubmit={handleConfirmPayment} className="ud-form">
                        <label className="clean-field">
                          <span>Cardholder Name</span>
                          <input
                            type="text"
                            name="cardHolder"
                            placeholder="Name on card"
                            value={card.cardHolder}
                            onChange={handleCardChange}
                          />
                        </label>
                        <label className="clean-field">
                          <span>Card Number</span>
                          <input
                            type="text"
                            name="cardNumber"
                            placeholder="1234 5678 9012 3456"
                            value={card.cardNumber}
                            onChange={handleCardChange}
                          />
                        </label>
                        <div className="grid-two">
                          <label className="clean-field">
                            <span>Expiry</span>
                            <input
                              type="text"
                              name="expiry"
                              placeholder="MM/YY"
                              value={card.expiry}
                              onChange={handleCardChange}
                            />
                          </label>
                          <label className="clean-field">
                            <span>CVV</span>
                            <input
                              type="password"
                              name="cvv"
                              placeholder="123"
                              value={card.cvv}
                              onChange={handleCardChange}
                            />
                          </label>
                        </div>
                        <button
                          className="btn wide"
                          type="submit"
                          disabled={isSubmittingPayment}
                        >
                          {isSubmittingPayment
                            ? "Processing..."
                            : `Pay Now ${fare ? `($${fare})` : ""}`}
                        </button>
                      </form>
                    </section>
                  </div>
                </div>
              )}

              {/* REWARDS TAB */}
              {activeTab === "rewards" && (
                <div className="rewards-layout">
                  <section className="ud-hero">
                    <h1>Your Rewards 🏅</h1>
                    <p>Collect fun badges as you keep riding with Masto Ride.</p>
                  </section>
                  <section className="ud-panel">
                    <header className="ud-head">
                      <h2>Badges</h2>
                    </header>
                    <div className="badges-grid">
                      {availableBadges.map((b) => (
                        <div
                          key={b.id}
                          className={`badge-card ${
                            b.earned ? "earned" : "locked"
                          }`}
                        >
                          <div className="badge-icon">
                            {b.earned ? "🏅" : "🔒"}
                          </div>
                          <div className="badge-label">{b.label}</div>
                          <div className="badge-status">
                            {b.earned ? "Unlocked" : "Locked"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* HISTORY TAB */}
              {activeTab === "history" && (
                <div className="history-layout">
                  <section className="ud-hero">
                    <h1>Ride History 🕘</h1>
                    <p>Quick view of rides you’ve booked (demo data).</p>
                  </section>
                  <section className="ud-panel">
                    <header className="ud-head">
                      <h2>Past Rides</h2>
                    </header>
                    {rideHistory.length === 0 ? (
                      <p>You haven&apos;t booked any rides yet.</p>
                    ) : (
                      <div className="history-list">
                        {rideHistory.map((r) => (
                          <div key={r.id} className="history-item">
                            <div>
                              <strong>
                                {r.pickup} → {r.dropoff}
                              </strong>
                              <div className="history-meta">
                                {r.date} at {r.time} • {r.passengers} passenger(s)
                              </div>
                            </div>
                            <div className="history-fare">${r.fare}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* SUCCESS MODAL */}
      {showPaymentSuccess && (
        <div className="payment-overlay" onClick={closeSuccessModal}>
          <div
            className="payment-confirmed-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confetti-icon">🎉</div>
            <h2>RIDE CONFIRMED YAY!</h2>
            <p>Your ride has been booked successfully!</p>
            <button
              className="btn wide"
              type="button"
              onClick={closeSuccessModal}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
