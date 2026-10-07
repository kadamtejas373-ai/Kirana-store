let products=[], cart=JSON.parse(localStorage.getItem("kiranaCart")||"{}");

const $=id=>document.getElementById(id);
async function api(url,opts={}){const r=await fetch(url,opts);const d=await r.json();if(!r.ok)throw Error(d.error||"Request failed");return d}
async function loadCategories(){const cats=await api("/api/categories"); $("category").innerHTML='<option>All</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join("")}
async function loadProducts(){
  const q=$("search").value, category=$("category").value;
  products=await api(`/api/products?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}`);
  renderProducts();
}
function renderProducts(){
  $("products").innerHTML=products.map(p=>`
    <article class="card">
      <div class="product-img">${p.image?`<img src="${esc(p.image)}" style="max-width:100%;max-height:100%">`:"🛍️"}</div>
      <div class="muted">${esc(p.category)}</div><h3>${esc(p.name)}</h3>
      <div class="muted">Available: ${p.stock} ${esc(p.unit)}</div>
      <div class="price">₹${Number(p.price).toFixed(2)} / ${esc(p.unit)}</div>
      <button ${p.stock<1?"disabled":""} onclick="add(${p.id})">${p.stock<1?"Out of stock":"Add to cart"}</button>
    </article>`).join("") || "<p>No products found.</p>";
}
function add(id){cart[id]=(cart[id]||0)+1;saveCart();renderCart()}
function change(id,n){cart[id]+=n;if(cart[id]<=0)delete cart[id];saveCart();renderCart()}
function saveCart(){localStorage.setItem("kiranaCart",JSON.stringify(cart))}
function renderCart(){
  let total=0,html="";
  for(const [id,qty] of Object.entries(cart)){
    const p=products.find(x=>x.id==id);
    if(!p)continue;
    total+=p.price*qty;
    html+=`<div class="cart-row"><span>${esc(p.name)} × ${qty}</span><span>₹${(p.price*qty).toFixed(2)} <span class="qty"><button onclick="change(${id},-1)">−</button><button onclick="change(${id},1)">+</button></span></span></div>`;
  }
  $("cart").innerHTML=html||"<p>Your cart is empty.</p>";
  $("total").textContent=total.toFixed(2);
}
$("search").addEventListener("input",loadProducts);$("category").addEventListener("change",loadProducts);
$("checkoutBtn").onclick=()=>{if(Object.keys(cart).length){$("checkout").classList.remove("hidden");scrollTo({top:document.body.scrollHeight,behavior:"smooth"})}else alert("Cart is empty.")};
$("cancelCheckout").onclick=()=>$("checkout").classList.add("hidden");
$("orderForm").onsubmit=async e=>{
 e.preventDefault();
 const items=Object.entries(cart).map(([productId,quantity])=>({productId:Number(productId),quantity}));
 try{
  const d=await api("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customerName:$("customerName").value,phone:$("phone").value,address:$("address").value,items})});
  $("orderMessage").innerHTML=`<b>Order placed!</b> Your order number is #${d.order.id}. Total ₹${d.order.total.toFixed(2)}.`;
  cart={};saveCart();renderCart();e.target.reset();loadProducts();
 }catch(err){$("orderMessage").textContent=err.message}
};
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
(async()=>{await loadCategories();await loadProducts();renderCart()})()
