import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  Boxes,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  LogOut,
} from "lucide-react";
import "./App.css";

const API_URL = "https://stockflow-k9wh.onrender.com";

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [token, setToken] = useState(
    localStorage.getItem("stockflow_token") || "",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [dashboard, setDashboard] = useState({
    total_products: 0,
    total_quantity: 0,
    low_stock_count: 0,
  });
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    quantity: 0,
    cost_price: "",
    selling_price: "",
    low_stock_threshold: 5,
  });

  async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.detail || `Request failed (${response.status})`);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [summary, items] = await Promise.all([
        request("/dashboard"),
        request("/products"),
      ]);
      setDashboard(summary);
      setProducts(items);
    } catch (err) {
      setError(err.message);
      if (
        err.message.includes("token") ||
        err.message.includes("Not authenticated")
      ) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadData();
    // Load data when the signed-in token changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function authenticate(event) {
    event.preventDefault();
    setError("");
    try {
      const path = isSignup ? "/auth/signup" : "/auth/login";
      const body = isSignup
        ? { email, password, organization_name: organizationName }
        : { email, password };

      const response = await fetch(`${API_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Unable to sign in");
      }

      localStorage.setItem("stockflow_token", result.access_token);
      setToken(result.access_token);
    } catch (err) {
      setError(err.message);
    }
  }

  function logout() {
    localStorage.removeItem("stockflow_token");
    setToken("");
    setProducts([]);
    setDashboard({
      total_products: 0,
      total_quantity: 0,
      low_stock_count: 0,
    });
  }

  function openAddForm() {
    setEditingId(null);
    setForm({
      name: "",
      sku: "",
      description: "",
      quantity: 0,
      cost_price: "",
      selling_price: "",
      low_stock_threshold: 5,
    });
    setShowForm(true);
    setError("");
  }

  function openEditForm(product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      sku: product.sku,
      description: product.description || "",
      quantity: product.quantity,
      cost_price: product.cost_price ?? "",
      selling_price: product.selling_price ?? "",
      low_stock_threshold: product.low_stock_threshold ?? 5,
    });
    setShowForm(true);
    setError("");
  }

  async function saveProduct(event) {
    event.preventDefault();
    setError("");

    const payload = {
      ...form,
      quantity: Number(form.quantity),
      cost_price: form.cost_price === "" ? null : Number(form.cost_price),
      selling_price:
        form.selling_price === "" ? null : Number(form.selling_price),
      low_stock_threshold:
        form.low_stock_threshold === ""
          ? null
          : Number(form.low_stock_threshold),
    };

    try {
      await request(editingId ? `/products/${editingId}` : "/products", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete "${product.name}"?`)) return;

    setError("");
    try {
      await request(`/products/${product.id}`, { method: "DELETE" });
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  const visibleProducts = products.filter((product) =>
    `${product.name} ${product.sku}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  if (!token) {
    return (
      <main className="auth-page">
        <form className="auth-card" onSubmit={authenticate}>
          <div className="brand-mark">
            <Boxes size={28} />
          </div>
          <p className="eyebrow">INVENTORY MANAGEMENT</p>
          <h1>{isSignup ? "Create your account" : "Welcome to StockFlow"}</h1>
          <p className="muted">Manage your products and stock in one place.</p>

          {error && <div className="error-banner">{error}</div>}

          {isSignup && (
            <label>
              Organization name
              <input
                required
                minLength={2}
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Your company name"
              />
            </label>
          )}

          <label>
            Email address
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </label>

          <label>
            Password
            <input
              required
              minLength={8}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </label>

          <button className="primary-btn full-width" type="submit">
            {isSignup ? "Create account" : "Sign in"}
          </button>

          <p className="switch-auth">
            {isSignup ? "Already have an account?" : "New to StockFlow?"}{" "}
            <button
              className="text-btn"
              type="button"
              onClick={() => {
                setIsSignup(!isSignup);
                setError("");
              }}
            >
              {isSignup ? "Sign in" : "Create account"}
            </button>
          </p>
        </form>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark small">
            <Boxes size={22} />
          </span>
          <span>StockFlow</span>
        </div>
        <p className="nav-heading">WORKSPACE</p>

        <div
          className={`nav-item ${activePage === "dashboard" ? "active" : ""}`}
          onClick={() => setActivePage("dashboard")}
        >
          <LayoutDashboard size={18} /> Dashboard
        </div>
        <div
          className={`nav-item ${activePage === "products" ? "active" : ""}`}
          onClick={() => setActivePage("products")}
        >
          <Package size={18} /> Products
        </div>

        <div className="sidebar-bottom">
          <div className="profile-dot">
            {email.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="profile-email">{email}</div>
          <button className="icon-btn" title="Sign out" onClick={logout}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">OVERVIEW</p>
            <h1>Inventory dashboard</h1>
            <p className="muted">
              Here's what's happening with your inventory.
            </p>
          </div>
          <button
            className="secondary-btn"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </header>

        {error && <div className="error-banner">{error}</div>}

        {activePage === "dashboard" && (
          <section className="stats-grid">
          <article className="stat-card">
            <div className="stat-icon purple">
              <Package size={21} />
            </div>
            <p>Total products</p>
            <strong>{dashboard.total_products}</strong>
            <span>Products in your catalog</span>
          </article>
          <article className="stat-card">
            <div className="stat-icon blue">
              <Boxes size={21} />
            </div>
            <p>Total quantity</p>
            <strong>{dashboard.total_quantity}</strong>
            <span>Units currently in stock</span>
          </article>
          <article className="stat-card">
            <div className="stat-icon orange">
              <AlertTriangle size={21} />
            </div>
            <p>Low-stock products</p>
            <strong>{dashboard.low_stock_count}</strong>
            <span>Products needing attention</span>
          </article>
        </section>)}

        <section className="products-panel">
          <div className="panel-header">
            <div>
              <h2>Products</h2>
              <p className="muted">Manage your inventory catalog.</p>
            </div>
            <button className="primary-btn" onClick={openAddForm}>
              <Plus size={17} /> Add product
            </button>
          </div>

          <div className="search-box">
            <Search size={18} />
            <input
              aria-label="Search products"
              placeholder="Search by product name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Quantity</th>
                  <th>Cost price</th>
                  <th>Selling price</th>
                  <th>Stock status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => {
                  const threshold = product.low_stock_threshold ?? 5;
                  const lowStock = product.quantity <= threshold;
                  return (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.name}</strong>
                        {product.description && (
                          <small>{product.description}</small>
                        )}
                      </td>
                      <td>{product.sku}</td>
                      <td>{product.quantity}</td>
                      <td>
                        {product.cost_price == null
                          ? "—"
                          : `₹${product.cost_price}`}
                      </td>
                      <td>
                        {product.selling_price == null
                          ? "—"
                          : `₹${product.selling_price}`}
                      </td>
                      <td>
                        <span
                          className={`status-pill ${lowStock ? "low" : "in-stock"}`}
                        >
                          {lowStock ? "Low stock" : "In stock"}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="small-btn"
                            onClick={() => openEditForm(product)}
                          >
                            Edit
                          </button>
                          <button
                            className="small-btn danger"
                            onClick={() => deleteProduct(product)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visibleProducts.length === 0 && (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      {search
                        ? "No matching products found."
                        : "No products yet. Add your first product."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <form
            className="product-modal"
            onSubmit={saveProduct}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header">
              <div>
                <h2>{editingId ? "Edit product" : "Add product"}</h2>
                <p className="muted">Enter the product details below.</p>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowForm(false)}
              >
                ✕
              </button>
            </div>

            <div className="form-grid">
              <label>
                Product name *
                <input
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                SKU *
                <input
                  required
                  maxLength={50}
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                />
              </label>
              <label className="span-two">
                Description
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </label>
              <label>
                Quantity *
                <input
                  required
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({ ...form, quantity: e.target.value })
                  }
                />
              </label>
              <label>
                Low-stock threshold
                <input
                  type="number"
                  min="0"
                  value={form.low_stock_threshold}
                  onChange={(e) =>
                    setForm({ ...form, low_stock_threshold: e.target.value })
                  }
                />
              </label>
              <label>
                Cost price
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost_price}
                  onChange={(e) =>
                    setForm({ ...form, cost_price: e.target.value })
                  }
                />
              </label>
              <label>
                Selling price
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.selling_price}
                  onChange={(e) =>
                    setForm({ ...form, selling_price: e.target.value })
                  }
                />
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button type="submit" className="primary-btn">
                {editingId ? "Save changes" : "Create product"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
