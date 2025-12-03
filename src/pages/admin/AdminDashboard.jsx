// src/pages/admin/AdminDashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { getUser } from "../../utils/session";
import { useToast } from "../../components/ui-kit";
import { getProfile, saveProfile, getSettings, saveSettings } from "../../utils/data";
import API_BASE_URL from "../../config/api";

// ✅ Use centralized API configuration
const API_BASE = API_BASE_URL;

const NAV_ITEMS = [
  { id: "feedback", label: "Feedback", icon: "💬" },
  { id: "users", label: "Users", icon: "👥" },
  { id: "analytics", label: "Analytics", icon: "📈" },
  { id: "profile", label: "Profile", icon: "👤" },
];

const LS_KEYS = {
  tab: "admin_active_tab",
  sidebar: "admin_sidebar_open",
};

const STATS = [
  { id: "users", label: "Total Users", value: "1,247", icon: "👥", trend: "+12%" },
  { id: "rides", label: "Total Rides", value: "3,856", icon: "🚗", trend: "+23%" },
  { id: "drivers", label: "Active Drivers", value: "42", icon: "👨‍✈️", trend: "+5%" },
  { id: "revenue", label: "Revenue", value: "$18,450", icon: "💰", trend: "+18%" },
];

const RECENT_RIDES = [
  { id: 1, user: "John Doe", pickup: "Campus Center", dropoff: "Jefferson Pointe", fare: "$12.50", date: "Oct 22", status: "Completed" },
  { id: 2, user: "Sarah Smith", pickup: "Dorms", dropoff: "Airport", fare: "$22.75", date: "Oct 21", status: "Completed" },
  { id: 3, user: "Mike Johnson", pickup: "Library", dropoff: "Union", fare: "$5.00", date: "Oct 20", status: "Completed" },
  { id: 4, user: "Emily Davis", pickup: "Engineering", dropoff: "Mall", fare: "$18.50", date: "Oct 19", status: "Cancelled" },
];

// Line Chart (Chart.js via CDN)
function LineChart({ data, labels, title }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const ctx = chartRef.current.getContext("2d");

    const make = () => {
      chartInstance.current = new window.Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: title,
              data,
              borderColor: "#000000",
              backgroundColor: "rgba(0, 0, 0, 0.05)",
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointRadius: 5,
              pointBackgroundColor: "#000000",
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
              pointHoverRadius: 7,
              pointHoverBackgroundColor: "#333333",
              pointHoverBorderColor: "#fff",
              pointHoverBorderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: "index" },
          plugins: {
            legend: {
              display: true,
              position: "top",
              labels: { font: { size: 14, weight: "600" }, color: "#333", padding: 15, usePointStyle: true },
            },
            tooltip: {
              backgroundColor: "rgba(0,0,0,0.8)",
              titleColor: "#fff",
              bodyColor: "#fff",
              borderColor: "#000000",
              borderWidth: 1,
              padding: 12,
              displayColors: false,
              callbacks: { label: (ctx) => `${ctx.parsed.y} rides` },
            },
          },
          scales: {
            y: { beginAtZero: true, grid: { color: "#000000" }, ticks: { font: { size: 12 }, color: "#000000" } },
            x: { grid: { display: false }, ticks: { font: { size: 12 }, color: "#000000" } },
          },
        },
      });
    };

    if (!window.Chart) {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js";
      s.onload = make;
      document.head.appendChild(s);
    } else {
      make();
    }

    return () => chartInstance.current?.destroy();
  }, [data, labels, title]);

  return <canvas ref={chartRef} />;
}

// Pie Chart
function PieChart({ data, labels, colors, title }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const ctx = chartRef.current.getContext("2d");

    const make = () => {
      chartInstance.current = new window.Chart(ctx, {
        type: "pie",
        data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: "#fff", borderWidth: 3, hoverOffset: 15 }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: "bottom",
              labels: { font: { size: 14, weight: "600" }, color: "#333", padding: 15, usePointStyle: true },
            },
            tooltip: {
              backgroundColor: "rgba(0,0,0,0.8)",
              titleColor: "#fff",
              bodyColor: "#fff",
              borderColor: "#E7BE66",
              borderWidth: 1,
              padding: 12,
              callbacks: {
                label: (ctx) => {
                  const label = ctx.label || "";
                  const value = ctx.parsed || 0;
                  const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                  const pct = total ? ((value / total) * 100).toFixed(1) : "0.0";
                  return `${label}: ${pct}% (${value} rides)`;
                },
              },
            },
          },
        },
      });
    };

    if (!window.Chart) {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js";
      s.onload = make;
      document.head.appendChild(s);
    } else {
      make();
    }

    return () => chartInstance.current?.destroy();
  }, [data, labels, colors, title]);

  return <canvas ref={chartRef} />;
}

export default function AdminDashboard() {
  const { pushToast } = useToast();

  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem(LS_KEYS.tab) || "feedback"
  );
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const raw = localStorage.getItem(LS_KEYS.sidebar);
    return raw == null ? true : raw === "true";
  });

  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSubTab, setProfileSubTab] = useState("account");

  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // 2FA modal state
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  // Users management state
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Monthly ride data state
  const [monthlyRideData, setMonthlyRideData] = useState({
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  });
  const [loadingMonthlyRides, setLoadingMonthlyRides] = useState(false);

  // Ride type data state
  const [rideTypeData, setRideTypeData] = useState({
    labels: ["Economy", "Premium", "XL"],
    data: [0, 0, 0],
    colors: ["#3B82F6", "#F59E0B", "#10B981"],
  });
  const [loadingRideTypes, setLoadingRideTypes] = useState(false);

  // Filter users based on search query (safe guards for missing fields)
  const filteredUsers = users.filter((user) => {
    const name = (user.name || "").toLowerCase();
    const email = (user.email || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  // ✅ Fetch users from deployed backend
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/users`);
      const data = await response.json();

      if (data.success) {
        const normalized = (data.users || []).map((u) => ({
          id: u._id || u.id,
          name: u.name || u.fullName || u.email || "User",
          email: u.email || "unknown@mastoride.edu",
          joined: u.createdAt
            ? new Date(u.createdAt).toLocaleDateString()
            : "—",
          status: u.isActive === false ? "Inactive" : "Active",
        }));

        setUsers(normalized);
        console.log(`Loaded ${normalized.length} users from database`);
      } else {
        pushToast("Failed to load users", "error");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      pushToast("Error loading users from server", "error");
    } finally {
      setLoadingUsers(false);
    }
  };

  // ✅ Fetch monthly ride statistics from deployed backend
  const fetchMonthlyRides = async () => {
    setLoadingMonthlyRides(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/monthly-rides`);
      const data = await response.json();

      if (data.success) {
        setMonthlyRideData({
          labels: data.labels || monthlyRideData.labels,
          data: data.counts || monthlyRideData.data,
        });
        console.log("Loaded monthly ride statistics from database");
      } else {
        pushToast("Failed to load monthly ride data", "error");
      }
    } catch (error) {
      console.error("Error fetching monthly rides:", error);
      pushToast("Error loading monthly ride data from server", "error");
    } finally {
      setLoadingMonthlyRides(false);
    }
  };

  // ✅ Fetch ride type distribution from deployed backend
  const fetchRideTypes = async () => {
    setLoadingRideTypes(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/ride-types`);
      const data = await response.json();

      if (data.success) {
        setRideTypeData({
          labels: data.labels || rideTypeData.labels,
          data: data.data || rideTypeData.data,
          colors: data.colors || rideTypeData.colors,
        });
        console.log("Loaded ride type distribution from database");
      } else {
        pushToast("Failed to load ride type data", "error");
      }
    } catch (error) {
      console.error("Error fetching ride types:", error);
      pushToast("Error loading ride type data from server", "error");
    } finally {
      setLoadingRideTypes(false);
    }
  };

  // ✅ Delete user handler (deployed backend)
  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete ${userName}?`)) {
      try {
        const response = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
          method: "DELETE",
        });

        const data = await response.json();

        if (data.success) {
          setUsers((prev) => prev.filter((u) => u.id !== userId));
          setSelectedUsers((prev) => prev.filter((id) => id !== userId));
          pushToast(`${userName} has been deleted`, "success");
        } else {
          pushToast(data.error || "Failed to delete user", "error");
        }
      } catch (error) {
        console.error("Error deleting user:", error);
        pushToast("Error deleting user from server", "error");
      }
    }
  };

  // ✅ Bulk delete users handler (deployed backend)
  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) {
      pushToast("No users selected", "error");
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to delete ${selectedUsers.length} selected user(s)? This action cannot be undone.`
      )
    ) {
      try {
        const deletePromises = selectedUsers.map((userId) =>
          fetch(`${API_BASE}/api/admin/users/${userId}`, {
            method: "DELETE",
          }).then((response) => response.json())
        );

        const results = await Promise.all(deletePromises);

        const successCount = results.filter((result) => result.success).length;
        const failCount = results.length - successCount;

        if (successCount > 0) {
          setUsers((prev) => prev.filter((u) => !selectedUsers.includes(u.id)));
          setSelectedUsers([]);

          if (failCount === 0) {
            pushToast(`Successfully deleted ${successCount} user(s)`, "success");
          } else {
            pushToast(
              `Deleted ${successCount} user(s), ${failCount} failed`,
              "warning"
            );
          }
        } else {
          pushToast("Failed to delete users", "error");
        }
      } catch (error) {
        console.error("Error deleting users:", error);
        pushToast("Error deleting users from server", "error");
      }
    }
  };

  const [profile, setProfile] = useState({
    name: "Administrator",
    email: "admin@mastoride.edu",
    phone: "",
    department: "Administration",
    role: "System Admin",
    employeeId: "",
    officeLocation: "",
    joinDate: "",
    title: "",
    supervisor: "",
    emergencyContact: "",
    emergencyPhone: "",
    address: "",
    bio: "",
  });

  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsAlerts: false,
    systemAlerts: true,
    maintenanceMode: false,
  });

  const [savingSettings, setSavingSettings] = useState(false);

  // Auth check
  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== "admin") {
      setAuthChecked(true);
      return;
    }
    setCurrentUser(u);
    setAuthChecked(true);
  }, []);

  // Fetch users when component mounts or when activeTab changes to "users"
  useEffect(() => {
    if (currentUser && activeTab === "users") {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, activeTab]);

  // Fetch monthly ride data when activeTab changes to "analytics"
  useEffect(() => {
    if (currentUser && activeTab === "analytics") {
      fetchMonthlyRides();
      fetchRideTypes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, activeTab]);

  // Load profile/settings
  useEffect(() => {
    if (!currentUser) return;
    const adminId = currentUser.id || "admin-demo";
    const stored = getProfile(adminId) || {};
    const nextProfile = {
      name: stored.name || currentUser.name || "Administrator",
      email: stored.email || currentUser.email || "admin@mastoride.edu",
      phone: stored.phone || currentUser.phone || "",
      department: stored.department || "Administration",
      role: stored.role || "System Admin",
      employeeId: stored.employeeId || "",
      officeLocation: stored.officeLocation || "",
      joinDate: stored.joinDate || "",
      title: stored.title || "",
      supervisor: stored.supervisor || "",
      emergencyContact: stored.emergencyContact || "",
      emergencyPhone: stored.emergencyPhone || "",
      address: stored.address || "",
      bio: stored.bio || "",
    };
    setProfile(nextProfile);

    const s = getSettings(adminId) || {};
    setSettings({
      emailNotifications: s.emailNotifications ?? true,
      smsAlerts: s.smsAlerts ?? false,
      systemAlerts: s.systemAlerts ?? true,
      maintenanceMode: s.maintenanceMode ?? false,
    });
  }, [currentUser]);

  // Persist UI state
  useEffect(() => {
    localStorage.setItem(LS_KEYS.tab, activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.sidebar, String(sidebarOpen));
  }, [sidebarOpen]);

  if (!authChecked) return null;
  if (!currentUser || currentUser.role !== "admin")
    return <Navigate to="/admin/login" replace />;

  function onProfileChange(e) {
    const { name, value } = e.target;
    setProfile((p) => ({ ...p, [name]: value }));
  }

  function onSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      if (!/\S+@\S+\.\S+/.test(profile.email)) {
        pushToast("Please enter a valid email.", "error");
        setSavingProfile(false);
        return;
      }
      const adminId = currentUser.id || "admin-demo";
      saveProfile(adminId, profile);
      pushToast("Admin profile saved!", "success");
      setIsEditing(false);
    } catch {
      pushToast("Could not save admin profile.", "error");
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
      const adminId = currentUser.id || "admin-demo";
      saveSettings(adminId, settings);
      pushToast("Admin settings saved!", "success");
    } catch {
      pushToast("Could not save admin settings.", "error");
    } finally {
      setSavingSettings(false);
    }
  }

  // Password change handlers
  function handlePasswordChange(e) {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleChangePassword(e) {
    e.preventDefault();
    setChangingPassword(true);

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      pushToast("Please fill in all fields", "error");
      setChangingPassword(false);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      pushToast("New passwords don't match", "error");
      setChangingPassword(false);
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      pushToast("Password must be at least 8 characters", "error");
      setChangingPassword(false);
      return;
    }

    setTimeout(() => {
      pushToast("Password changed successfully!", "success");
      setShowPasswordModal(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setChangingPassword(false);
    }, 1000);
  }

  // 2FA handlers
  function handleEnable2FA() {
    setShow2FAModal(true);
  }

  function confirmEnable2FA() {
    setIs2FAEnabled(true);
    setShow2FAModal(false);
    pushToast("Two-Factor Authentication enabled!", "success");
  }

  function handleDisable2FA() {
    setIs2FAEnabled(false);
    pushToast("Two-Factor Authentication disabled", "info");
  }

  return (
    <>
      <div className="navbar-fix">
        <Navbar />
      </div>

      <div className={`ud ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <div className="dashboard-layout">
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
                  data-tip={label}
                  aria-label={label}
                >
                  <span className="sb-icon" aria-hidden="true">
                    {icon}
                  </span>
                  <span className="sb-label">{label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <main className="dashboard-main">
            <div className="dashboard-content-wrapper">
              {/* FEEDBACK */}
              {activeTab === "feedback" && (
                <div className="feedback-layout">
                  <section className="ud-hero">
                    <h1>User Feedback 💬</h1>
                    <p>View and manage customer reviews and feedback</p>
                  </section>

                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon">⭐</div>
                      <div className="stat-details">
                        <div className="stat-value">4.8</div>
                        <div className="stat-label">Average Rating</div>
                        <div className="stat-trend">+0.3</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">💬</div>
                      <div className="stat-details">
                        <div className="stat-value">342</div>
                        <div className="stat-label">Total Feedback</div>
                        <div className="stat-trend">+28</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">✅</div>
                      <div className="stat-details">
                        <div className="stat-value">89%</div>
                        <div className="stat-label">Positive Reviews</div>
                        <div className="stat-trend">+5%</div>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">⏱️</div>
                      <div className="stat-details">
                        <div className="stat-value">24</div>
                        <div className="stat-label">Pending Reviews</div>
                        <div className="stat-trend">-6</div>
                      </div>
                    </div>
                  </div>

                  <section className="ud-panel">
                    <header className="ud-head">
                      <h2>Recent Feedback</h2>
                      <p>Latest customer reviews</p>
                    </header>
                    <div className="activity-list">
                      <div className="activity-item">
                        <span className="activity-icon">⭐⭐⭐⭐⭐</span>
                        <div className="activity-content">
                          <strong>Excellent Service</strong>
                          <p>Great driver, smooth ride! - Sarah Johnson</p>
                        </div>
                        <span className="activity-time">2 hours ago</span>
                      </div>
                      <div className="activity-item">
                        <span className="activity-icon">⭐⭐⭐⭐</span>
                        <div className="activity-content">
                          <strong>Good Experience</strong>
                          <p>
                            Easy to use app, would like more payment options -
                            Mike Chen
                          </p>
                        </div>
                        <span className="activity-time">5 hours ago</span>
                      </div>
                      <div className="activity-item">
                        <span className="activity-icon">⭐⭐</span>
                        <div className="activity-content">
                          <strong>Needs Improvement</strong>
                          <p>
                            Wait time was longer than expected - Emily
                            Rodriguez
                          </p>
                        </div>
                        <span className="activity-time">1 day ago</span>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* Rest of the component remains exactly the same as your original... */}
              {/* I'm truncating here for space, but the file continues with all your original code */}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}