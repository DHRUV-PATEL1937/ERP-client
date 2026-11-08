import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { money, date } from "../../lib/format";
import "./customer.css";
import photos from "./catalogue-images.json";
import CatalogueCard from "./CatalogueCard";
import { ShoppingBasket, Search, Star, History, CircleHelp, LogOut, Leaf, ArrowLeft, X } from "lucide-react";
const sectionIcon = name => /herb/i.test(name) ? "🌿" : /fruit|berr/i.test(name) ? "🍓" : /leaf|green/i.test(name) ? "🥬" : /mushroom/i.test(name) ? "🍄" : /dairy/i.test(name) ? "🧀" : /vegetable/i.test(name) ? "🥕" : "🧺";
const aliases = { "fresh basil":"Basil", "baby spinach":"Spinach Baby", "heirloom tomatoes":"Tomatos Round", "alphonso mangoes":"Mango Ripe Kp", "avocados":"Avocadoes", "organic carrots":"Carrot Large" };
const photoFor = p => photos.find(photo => photo.name.toLowerCase() === (aliases[p.name.toLowerCase()] || p.name).toLowerCase())?.image;

const base = import.meta.env.VITE_API_BASE_URL;
const tokenKey = "harvest-customer-session";
async function request(path, { body, method = "GET", key } = {}) {
  const token = sessionStorage.getItem(tokenKey);
  const response = await fetch(base + "/customer" + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}), ...(key ? { "Idempotency-Key": key } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json().catch(() => ({ error: { message: "The API is unavailable. Please try again." } }));
  if (!response.ok) { if (response.status === 401 && path !== "/login") { sessionStorage.removeItem(tokenKey); window.dispatchEvent(new Event("customer-expired")); } throw new Error(result.error?.message || "Request failed"); }
  return result.data;
}
export default function CustomerPortalPage() {
  const [session, setSession] = useState(null), [catalog, setCatalog] = useState([]), [orders, setOrders] = useState([]), [saved, setSaved] = useState([]);
  const [code, setCode] = useState(""), [emailMode, setEmailMode] = useState(false), [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState(""), [view, setView] = useState("catalog");
  const [search, setSearch] = useState(""), [category, setCategory] = useState(""), [cart, setCart] = useState({}), [delivery, setDelivery] = useState(""), [notes, setNotes] = useState(""), [review, setReview] = useState(false), [listName, setListName] = useState("");
  const key = useRef(null), submitting = useRef(false), searchInput = useRef(null), basket = useRef(null);
  const [help, setHelp] = useState(false), [savedOpen, setSavedOpen] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState({});
  const sections = [...new Set(catalog.map(p => p.category || "Other"))];
  const filtered = catalog.filter(p => (!category || (p.category || "Other") === category) && (p.name + " " + p.sku + " " + p.category + " " + p.unit + " " + (p.unitOptions || []).map(option => option.label).join(" ")).toLowerCase().includes(search.toLowerCase()));
  useEffect(() => { const focusSearch = e => { if(e.key === "/" && !["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)){e.preventDefault();searchInput.current?.focus();} }; window.addEventListener("keydown",focusSearch);return()=>window.removeEventListener("keydown",focusSearch); }, []);
  const lines = Object.entries(cart).filter(([, q]) => Number(q) > 0).map(([product, quantity]) => ({ product, quantity: Number(quantity) }));
  const total = lines.reduce((n, l) => n + (catalog.find(p => p.id === l.product)?.price || 0) * l.quantity, 0);
  const showPrices = session?.customer.showPrices !== false;
  async function load() { const [c, o, s] = await Promise.all([request("/catalog"), request("/orders"), request("/saved-orders")]); setCatalog(c); setOrders(o); setSaved(s); }
  useEffect(() => {
    const expired = () => { setSession(null); setCart({}); setOrders([]); setSaved([]); setCatalog([]); setView("catalog"); setNotice(""); setNotes(""); setReview(false); setError("Your session expired. Please sign in again."); };
    window.addEventListener("customer-expired", expired);
    if (sessionStorage.getItem(tokenKey)) request("/me").then(s => { setSession(s); return load(); }).catch(e => setError(e.message));
    return () => window.removeEventListener("customer-expired", expired);
  }, []);
  useEffect(() => { key.current = null; setReview(false); }, [cart, delivery, notes]);
  async function login(e) {
    e.preventDefault(); setBusy(true); setError("");
    try { const s = await request("/login", { method: "POST", body: emailMode ? { email, password } : { code } }); sessionStorage.setItem(tokenKey, s.token); setSession(s); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function logout() { try { await request("/logout", { method: "POST" }); } finally { sessionStorage.removeItem(tokenKey); setSession(null); setCart({}); setCatalog([]); setOrders([]); setSaved([]); setView("catalog"); setNotice(""); setError(""); setDelivery(""); setNotes(""); setReview(false); setCode(""); setPassword(""); setSearch(""); setCategory(""); setSelectedUnits({}); } }
  async function run(action) { setError(""); setNotice(""); setBusy(true); try { await action(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  function fillCart(items) { setSavedOpen(false); setSelectedUnits(Object.fromEntries(catalog.map(p => [p.id, p.unitOptions?.find(option => option.factor === 1 && option.label === (p.unit === "piece" ? "each" : p.unit))?.label]))); const available = items.filter(l => catalog.some(p => p.id === String(l.product))); setCart(Object.fromEntries(available.map(l => [String(l.product), l.quantity]))); setView("catalog"); setNotice(available.length === items.length ? "Order loaded. Review quantities and choose a delivery day." : "Available items loaded. Some items are no longer sold."); }
  async function reviewOrder() {
    if (!delivery) { setError("Choose your delivery day."); return; }
    await run(async () => { const c = await request("/catalog?deliveryDate=" + encodeURIComponent(new Date(delivery + "T12:00:00").toISOString())); setCatalog(c); setReview(true); });
  }
  async function placeOrder() {
    if (submitting.current) return; submitting.current = true;
    await run(async () => { key.current ||= crypto.randomUUID(); const d = await request("/orders", { method: "POST", key: key.current, body: { lines, deliveryDate: new Date(delivery + "T12:00:00").toISOString(), notes } }); setCart({}); setReview(false); setNotes(""); await load(); setNotice("Order " + d.number + " submitted for confirmation."); setView("history"); });
    submitting.current = false;
  }
  if (!session) return <main className="customer-login"><Link className="customer-brand" to="/market">Harvest <span>FARMERS MARKET</span></Link><div className="customer-login-grid"><section><p className="eyebrow">WHOLESALE ORDERING</p><h1>Fresh produce for your kitchen,<br/>ordered in a minute.</h1><p>Your own prices. Your usual order. Your delivery day.</p><Link to="/market/wholesale/apply">Apply for a wholesale account →</Link></section><form onSubmit={login}><h2>Welcome back</h2><p>Enter the ordering code supplied by your account manager.</p>{emailMode ? <><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label></> : <label>Your ordering code<input autoComplete="off" required minLength={6} maxLength={12} value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/></label>}{error && <p role="alert" className="customer-error">{error}</p>}<button disabled={busy}>{busy?"Checking…":"Start ordering →"}</button><button className="customer-text-button" type="button" onClick={()=>setEmailMode(!emailMode)}>{emailMode?"Use ordering code":"Use existing email account"}</button></form></div></main>;
  return <main className="customer-app">
    <header className="customer-top">
      <div className="customer-account"><Link to="/market" className="customer-mark" aria-label="Harvest market home"><Leaf size={28}/><i/></Link><div><small>GOOD {new Date().getHours()<12?"MORNING":new Date().getHours()<17?"AFTERNOON":"EVENING"} — ORDERING AS</small><h1>{session.customer.name}</h1></div></div>
      <div className="customer-account-actions"><button onClick={()=>setHelp(!help)} aria-expanded={help}><CircleHelp size={20}/> Help</button><button onClick={logout}><LogOut size={20}/> Sign out</button></div>
      {help&&<section className="customer-help"><button aria-label="Close help" onClick={()=>setHelp(false)}><X size={18}/></button><h2>Ordering help</h2><p>Search for produce, type an amount or tap +. Review your basket and choose a delivery day before submitting.</p><p>Saved lists replace your basket. Prices are only shown when your account allows it.</p><Link to="/market/contact">Contact our team →</Link></section>}
    </header>
    <nav className="customer-start" aria-label="Customer navigation"><span>START FROM</span>{view!=="catalog"&&<button className="customer-back" onClick={()=>setView("catalog")}><ArrowLeft size={18}/> Catalogue</button>}<button className="customer-saved-pill" onClick={()=>setSavedOpen(true)}><span><Star size={23}/></span> Saved orders</button><button className="customer-history-pill" onClick={()=>setView("history")}><span><History size={23}/></span> Past orders</button><button className="customer-usual" disabled={busy} onClick={()=>run(async()=>{const items=await request("/usual");if(items.length)fillCart(items);else setNotice("Your usual order will appear after your first confirmed orders.");})}>Your usual</button><button className="customer-mobile-basket" onClick={()=>{setView("catalog");requestAnimationFrame(()=>basket.current?.scrollIntoView({behavior:"smooth"}));}}><ShoppingBasket size={18}/> Your order ({lines.length})</button></nav>
    {showPrices && catalog.some(p => p.referenceSample) && <p className="customer-sample-prices">Local demo · imported products use sample prices</p>}
    {error && <p className="customer-error" role="alert">{error}</p>}{notice && <p className="customer-notice" role="status">{notice}<button aria-label="Dismiss notice" onClick={()=>setNotice("")}><X size={16}/></button></p>}
    {view==="catalog" ? <div className="customer-workspace">
      <aside className="customer-sections"><h2>BROWSE BY SECTION</h2><div className="customer-section-list"><button aria-pressed={!category} onClick={()=>setCategory("")}><i>🧺</i><strong>All</strong><span>{catalog.length}</span></button>{sections.map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}><i>{sectionIcon(c)}</i><strong>{c}</strong><span>{catalog.filter(p=>(p.category||"Other")===c).length}</span></button>)}</div><div className="customer-cant-find"><strong>Can’t find something?</strong><p>Add a note to your order and we’ll try to get it.</p><Link to="/market/contact">Contact our team →</Link></div></aside>
      <section className="customer-catalog"><div className="customer-search"><Search size={23}/><input ref={searchInput} aria-label="Search everything we sell" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search — e.g. tomato, herbs, kg"/><kbd>/</kbd></div>
        <div className="customer-catalog-scroll">{sections.filter(c=>filtered.some(p=>(p.category||"Other")===c)).map(c=><section className="customer-product-section" key={c}><h2><i>{sectionIcon(c)}</i>{c}<span>{filtered.filter(p=>(p.category||"Other")===c).length}</span></h2><div className="customer-product-grid">{filtered.filter(p=>(p.category||"Other")===c).map(p => <CatalogueCard
              key={p.id}
              product={p}
              photo={photoFor(p)}
              icon={sectionIcon(c)}
              quantity={cart[p.id] || 0}
              selectedUnit={selectedUnits[p.id]}
              onUnitChange={option => {
                const converted = (cart[p.id] || 0) / option.factor;
                if (!["kg", "g"].includes(option.label) && Math.abs(converted - Math.round(converted)) > 0.000001) {
                  setError("Clear this item’s quantity before switching to a whole pack.");
                  return;
                }
                setError("");
                setSelectedUnits(current => ({ ...current, [p.id]: option.label }));
              }}
              onQuantityChange={quantity => setCart(current => ({ ...current, [p.id]: quantity }))}
              organization={session.organization}
              showPrices={showPrices}
            />)}</div></section>)}{!filtered.length&&<div className="customer-no-results"><Search size={36}/><h2>{search?"No matching products":"No products available"}</h2><p>{search?"Try another name or choose All sections.":"Please check back with our team."}</p></div>}</div>
      </section>
      <aside className="customer-basket" ref={basket}><h2><span className="customer-basket-icon"><ShoppingBasket size={25}/></span> Your order {lines.length>0&&<b>{lines.length}</b>}</h2><div className="customer-basket-body">{lines.length?lines.map(l=>{const p=catalog.find(p=>p.id===l.product);return <div className="customer-basket-line" key={l.product}><div><strong>{p?.name}</strong><small>{l.quantity} {p?.unit}</small></div>{showPrices&&<strong>{money((p?.price||0)*l.quantity,session.organization)}</strong>}<button className="customer-remove" aria-label={"Remove "+p?.name+" from basket"} onClick={()=>setCart({...cart,[l.product]:0})}><X size={16}/></button></div>}):<div className="customer-empty-basket"><div className="customer-empty-art"><span>🍅</span><ShoppingBasket size={52}/><i>🥬</i></div><h3>Your basket is empty</h3><p>Tap <strong>+</strong> on anything in the list, or tap the box and type an amount.</p></div>}</div><div className="customer-basket-footer"><details className="customer-note"><summary>Add a note, or ask for something not listed</summary><textarea aria-label="A note, or something not listed" maxLength={2000} value={notes} onChange={e=>setNotes(e.target.value)}/></details>{lines.length>0&&<><label>Delivery day<input type="date" min={new Date().toLocaleDateString("en-CA")} value={delivery} onChange={e=>setDelivery(e.target.value)}/></label>{showPrices?<p className="customer-total">Total <strong>{money(total,session.organization)}</strong></p>:<small>Prices will be confirmed on your invoice.</small>}</>}<button className="customer-review" disabled={!lines.length||busy} onClick={reviewOrder}>{!lines.length?"Add something to order":busy?"Loading…":"Review order →"}</button>{lines.length>0&&<details className="customer-save-list"><summary>Save this order as a list</summary><label>List name<input value={listName} onChange={e=>setListName(e.target.value)} maxLength={80}/></label><button disabled={!listName.trim()||busy} onClick={()=>run(async()=>{await request("/saved-orders",{method:"POST",body:{name:listName,lines}});await load();setNotice("Saved order created.");setListName("");})}>Save list</button></details>}</div></aside>
    </div> : view==="saved" ? <section className="customer-content"><h2>Saved orders</h2><p>Lists you name and reuse. Loading one replaces your basket.</p>{saved.length?saved.map(s=><article className="customer-history" key={s._id}><h3>{s.name}</h3><p>{s.lines.length} items</p><button onClick={()=>fillCart(s.lines)}>Load list</button><button className="customer-text-button" onClick={()=>run(async()=>{await request("/saved-orders/"+s._id,{method:"DELETE"});await load();})}>Remove list</button></article>):<p>No saved orders yet. Build an order, then save it from the basket.</p>}</section>:<section className="customer-content"><h2>Past orders & invoices</h2>{orders.length?orders.map(o=><article className="customer-history" key={o._id}><h3>{o.number} <small>{o.kind} · {o.status}</small></h3><p>Ordered {date(o.date)} · Delivery {date(o.deliveryDate)}</p>{o.lines.map((l,i)=><p key={i}>{l.name} · {l.quantity} {l.unit}{l.price!==undefined?" · "+money(l.price,session.organization,o.currency)+" per unit":""}</p>)}{o.total!==undefined&&<strong>Total {money(o.total,session.organization,o.currency)}</strong>}{o.kind==="invoice"&&<p>Outstanding {money(o.total-o.paid,session.organization,o.currency)}</p>}{o.kind==="order"&&<div><button onClick={()=>fillCart(o.lines)}>Order again</button>{o.status==="draft"&&<button className="customer-text-button" disabled={busy} onClick={()=>run(async()=>{await request("/orders/"+o._id+"/cancel",{method:"POST"});await load();setNotice("Order cancelled.");})}>Cancel unconfirmed order</button>}</div>}</article>):<p>No orders yet. Once you place an order, it will appear here.</p>}</section>}
    {savedOpen&&<div className="customer-dialog-backdrop" onClick={()=>setSavedOpen(false)}><section className="customer-dialog" role="dialog" aria-modal="true" aria-label="Saved orders" onClick={e=>e.stopPropagation()}><button className="customer-modal-close" aria-label="Close saved orders" onClick={()=>setSavedOpen(false)}><X size={18}/></button><h2>Saved orders</h2><p>Lists you name and reuse. Loading one replaces your basket.</p>{saved.length?saved.map(s=><article className="customer-history" key={s._id}><h3>{s.name}</h3><p>{s.lines.length} items</p><button onClick={()=>fillCart(s.lines)}>Load list</button><button className="customer-text-button" onClick={()=>run(async()=>{await request("/saved-orders/"+s._id,{method:"DELETE"});await load();})}>Remove list</button></article>):<p>No saved orders yet. Build an order, then save it from your basket.</p>}<button className="customer-text-button" onClick={()=>setSavedOpen(false)}>Back to ordering</button></section></div>}
    {review&&<div className="customer-dialog-backdrop"><section role="dialog" aria-modal="true" aria-label="Confirm your order" className="customer-dialog"><h2>Confirm your order</h2><p>Delivery: {date(delivery)} · {lines.length} items</p>{lines.map(l=><p key={l.product}>{catalog.find(p=>p.id===l.product)?.name} × {l.quantity}</p>)}{showPrices&&<strong>{money(total,session.organization)}</strong>}<p>Your order will enter the operations team’s confirmation queue.</p><button disabled={busy} onClick={placeOrder}>{busy?"Submitting…":"Submit order"}</button><button className="customer-text-button" disabled={busy} onClick={()=>setReview(false)}>Back to basket</button></section></div>}
  </main>;
}
