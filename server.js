const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "change-this-admin-key";
const DATA_FILE = path.join(__dirname, "store-data.json");

function now() {
  return new Date().toISOString();
}

function emptyData() {
  return {
    products: [],
    orders: [],
    order_items: [],
    expenses: [],
    nextIds: { products: 1, orders: 1, order_items: 1, expenses: 1 }
  };
}

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return emptyData();
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    const base = emptyData();
    data.nextIds = { ...base.nextIds, ...(data.nextIds || {}) };
    data.products ||= [];
    data.orders ||= [];
    data.order_items ||= [];
    data.expenses ||= [];
    return data;
  } catch (err) {
    console.error("Could not read store-data.json:", err.message);
    return emptyData();
  }
}

let db = loadData();

function saveData() {
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmp, DATA_FILE);
}

function nextId(type) {
  const id = db.nextIds[type]++;
  return id;
}

function seedProducts() {
  if (db.products.length) return;
  const seed = [
    ["Rice", "Grocery", 60, 48, 50, "kg", ""],
    ["Wheat Flour", "Grocery", 45, 36, 40, "kg", ""],
    ["Sugar", "Grocery", 48, 40, 35, "kg", ""],
    ["Toor Dal", "Pulses", 140, 118, 25, "kg", ""],
    ["Tea", "Beverages", 120, 95, 20, "pack", ""],
    ["Biscuits", "Snacks", 10, 7, 100, "pack", ""],
    ["Cooking Oil", "Grocery", 140, 125, 30, "litre", ""],
    ["Soap", "Personal Care", 35, 27, 60, "piece", ""]
  ];
  db.products = seed.map(([name, category, price, cost_price, stock, unit, image]) => ({
    id: nextId("products"), name, category, price, cost_price, stock, unit, image,
    active: 1, created_at: now()
  }));
  saveData();
}

seedProducts();

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (key !== ADMIN_KEY) return res.status(401).json({ error: "Invalid admin key" });
  next();
}

app.get("/api/products", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const category = String(req.query.category || "").trim();
  let rows = db.products.filter(p => p.active === 1);
  if (q) rows = rows.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  if (category && category !== "All") rows = rows.filter(p => p.category === category);
  rows.sort((a, b) => a.name.localeCompare(b.name));
  res.json(rows);
});

app.get("/api/categories", (req, res) => {
  const cats = [...new Set(db.products.filter(p => p.active === 1).map(p => p.category))].sort();
  res.json(cats);
});

app.post("/api/orders", (req, res) => {
  const { customerName, phone, address, items } = req.body;
  if (!customerName || !phone || !address || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: "Customer details and cart items are required." });
  }

  const rows = [];
  let total = 0;
  for (const item of items) {
    const qty = Number(item.quantity);
    const p = db.products.find(x => x.id === Number(item.productId) && x.active === 1);
    if (!p || qty < 1 || !Number.isInteger(qty)) return res.status(400).json({ error: "Invalid product or quantity." });
    if (p.stock < qty) return res.status(400).json({ error: `${p.name}: only ${p.stock} ${p.unit} available.` });
    total += p.price * qty;
    rows.push({ p, qty });
  }

  const orderId = nextId("orders");
  const order = {
    id: orderId,
    customer_name: customerName.trim(),
    phone: phone.trim(),
    address: address.trim(),
    total,
    status: "Pending",
    created_at: now()
  };
  db.orders.push(order);
  for (const row of rows) {
    db.order_items.push({
      id: nextId("order_items"), order_id: orderId, product_id: row.p.id,
      product_name: row.p.name, quantity: row.qty, price: row.p.price, cost_price: row.p.cost_price
    });
    row.p.stock -= row.qty;
  }
  saveData();
  res.json({ success: true, order: { id: orderId, total } });
});

app.get("/api/admin/dashboard", requireAdmin, (req, res) => {
  const activeProducts = db.products.filter(p => p.active === 1);
  const products = activeProducts.length;
  const totalOrders = db.orders.length;
  const pending = db.orders.filter(o => o.status === "Pending").length;
  const lowStock = activeProducts.filter(p => Number(p.stock) <= 5).length;
  const validOrders = db.orders.filter(o => o.status !== "Cancelled");
  const sales = validOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const expenses = db.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const validOrderIds = new Set(validOrders.map(o => o.id));
  const cogs = db.order_items.filter(i => validOrderIds.has(i.order_id))
    .reduce((sum, i) => sum + Number(i.quantity) * Number(i.cost_price), 0);
  res.json({ products, totalOrders, pending, lowStock, sales, expenses, profit: sales - cogs - expenses, cogs });
});

app.get("/api/admin/products", requireAdmin, (req, res) => {
  res.json([...db.products].sort((a, b) => b.id - a.id));
});

app.post("/api/admin/products", requireAdmin, (req, res) => {
  const { name, category, price, costPrice, stock, unit, image } = req.body;
  if (!name || !category || Number(price) < 0 || Number(costPrice) < 0 || Number(stock) < 0) {
    return res.status(400).json({ error: "Enter valid product details." });
  }
  const product = {
    id: nextId("products"), name: name.trim(), category: category.trim(),
    price: Number(price), cost_price: Number(costPrice), stock: Number(stock),
    unit: unit || "piece", image: image || "", active: 1, created_at: now()
  };
  db.products.push(product);
  saveData();
  res.json({ success: true, id: product.id });
});

app.put("/api/admin/products/:id", requireAdmin, (req, res) => {
  const { name, category, price, costPrice, stock, unit, image, active } = req.body;
  const p = db.products.find(x => x.id === Number(req.params.id));
  if (!p) return res.status(404).json({ error: "Product not found." });
  p.name = name.trim(); p.category = category.trim(); p.price = Number(price);
  p.cost_price = Number(costPrice); p.stock = Number(stock); p.unit = unit || "piece";
  p.image = image || ""; p.active = active ? 1 : 0;
  saveData();
  res.json({ success: true });
});

app.delete("/api/admin/products/:id", requireAdmin, (req, res) => {
  const p = db.products.find(x => x.id === Number(req.params.id));
  if (!p) return res.status(404).json({ error: "Product not found." });
  p.active = 0;
  saveData();
  res.json({ success: true });
});

app.get("/api/admin/orders", requireAdmin, (req, res) => {
  const orders = [...db.orders].sort((a, b) => b.id - a.id);
  res.json(orders.map(o => ({ ...o, items: db.order_items.filter(i => i.order_id === o.id) })));
});

app.patch("/api/admin/orders/:id", requireAdmin, (req, res) => {
  const allowed = ["Pending", "Confirmed", "Packed", "Delivered", "Cancelled"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: "Invalid status." });
  const o = db.orders.find(x => x.id === Number(req.params.id));
  if (!o) return res.status(404).json({ error: "Order not found." });
  o.status = req.body.status;
  saveData();
  res.json({ success: true });
});

app.get("/api/admin/expenses", requireAdmin, (req, res) => {
  res.json([...db.expenses].sort((a, b) => b.id - a.id));
});

app.post("/api/admin/expenses", requireAdmin, (req, res) => {
  const { title, amount } = req.body;
  if (!title || Number(amount) <= 0) return res.status(400).json({ error: "Enter a valid expense." });
  const expense = { id: nextId("expenses"), title: title.trim(), amount: Number(amount), created_at: now() };
  db.expenses.push(expense);
  saveData();
  res.json({ success: true, id: expense.id });
});

app.get("/api/admin/reports/sales", requireAdmin, (req, res) => {
  const byDay = {};
  db.orders.filter(o => o.status !== "Cancelled").forEach(o => {
    const day = o.created_at.slice(0, 10);
    if (!byDay[day]) byDay[day] = { day, orders: 0, sales: 0 };
    byDay[day].orders += 1;
    byDay[day].sales += Number(o.total);
  });
  res.json(Object.values(byDay).sort((a, b) => b.day.localeCompare(a.day)));
});

app.listen(PORT, () => {
  console.log(`Kirana Store running at http://localhost:${PORT}`);
  console.log(`Admin key: ${ADMIN_KEY}`);
});
