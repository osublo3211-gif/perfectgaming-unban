const CONFIG = {
  // PayPal.me username (לינק תשלום מהיר)
  PAYPAL_ME_USERNAME: "sendhereEzekiel",
  // Bit locked for now
  BIT_PAYMENT_URL: "CHANGE_ME"
};

const PRICES = { cheater: 15, troller: 10 };
const LABELS = { cheater: "צ׳יטרים", troller: "טרולרים" };

function makeOrderId(){
  const n = Math.floor(100000 + Math.random() * 900000);
  return "PG-" + n;
}
function saveOrder(order){
  localStorage.setItem("pg_order", JSON.stringify(order));
}
function loadOrder(){
  try{ return JSON.parse(localStorage.getItem("pg_order") || "null"); } catch { return null; }
}
function setText(id, v){
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}
function buildTicket(order){
  return `שלום צוות PerfectGaming,

בוצע תשלום עבור Unban.

מספר הזמנה: ${order.orderId}
סוג: ${order.typeLabel} ($${order.amount})

פרטי שחקן:
• דיסקורד: ${order.discord}
• ID: ${order.fivemId}
• סיבת באן: ${order.reason}
• מי נתן את הבאן (אם ידוע): ${order.admin || "לא ידוע"}

Transaction ID:
${order.txnId || "לא סופק"}

הסבר:
${order.appeal}

תודה.`;
}
function buildPayPalLink(amount){
  if(!CONFIG.PAYPAL_ME_USERNAME || CONFIG.PAYPAL_ME_USERNAME.startsWith("CHANGE_ME")) return "";
  return `https://www.paypal.me/${encodeURIComponent(CONFIG.PAYPAL_ME_USERNAME)}/${encodeURIComponent(amount)}`;
}
function buildBitLink(amount, orderId){
  if(!CONFIG.BIT_PAYMENT_URL || CONFIG.BIT_PAYMENT_URL.startsWith("CHANGE_ME")) return "";
  try{
    const u = new URL(CONFIG.BIT_PAYMENT_URL);
    u.searchParams.set("amount", String(amount));
    u.searchParams.set("order", orderId);
    return u.toString();
  }catch{
    return CONFIG.BIT_PAYMENT_URL;
  }
}

function initIndex(){
  window.PG_updatePrice = null;

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const typeSel = document.getElementById("type");
  const priceEl = document.getElementById("price");
  const form = document.getElementById("orderForm");
  if(!typeSel || !priceEl || !form) return;

  const update = () => {
    const amt = Number(PRICES[typeSel.value] ?? 0);
    priceEl.textContent = String(amt);
    document.documentElement.dataset.amount = String(amt);
  };
  window.PG_updatePrice = update;

  typeSel.addEventListener("change", update);
  update();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const type = String(fd.get("type") || "cheater");

    const order = {
      orderId: makeOrderId(),
      type,
      typeLabel: LABELS[type] || type,
      amount: PRICES[type] ?? 0,
      discord: String(fd.get("discord") || "").trim(),
      fivemId: String(fd.get("fivem_id") || "").trim(),
      reason: String(fd.get("reason") || "").trim(),
      admin: String(fd.get("admin") || "").trim(),
      appeal: String(fd.get("appeal") || "").trim(),
      txnId: "" // יישמר בעמוד תשלום
    };

    saveOrder(order);
    window.location.href = "pay.html";
  });
}

function initPay(){
  const order = loadOrder();
  if(!order){ window.location.href = "index.html"; return; }

  setText("orderId", order.orderId);
  setText("typeLabel", order.typeLabel);
  setText("amount", String(order.amount));

  const paypalBtn = document.getElementById("paypalBtn");
  const bitBtn = document.getElementById("bitBtn");

  const txnInput = document.getElementById("txnId");
  const confirmPaid = document.getElementById("confirmPaid");
  const afterBtn = document.getElementById("afterPayBtn");

  // PayPal link
  const paypalLink = buildPayPalLink(order.amount);
  if (paypalBtn){
    if (paypalLink){
      paypalBtn.href = paypalLink;
      paypalBtn.target = "_blank";
      paypalBtn.rel = "noopener";
    } else {
      paypalBtn.href = "#";
      paypalBtn.addEventListener("click",(e)=>{
        e.preventDefault();
        alert("אין PayPal.me מחובר. בדוק PAYPAL_ME_USERNAME בקובץ app.js");
      });
    }
  }

  // Bit locked for now
  if (bitBtn){
    // do nothing (button is disabled in pay.html)
  }

  // --- LOCK: allow continue only with Transaction ID + checkbox ---
  function looksLikeTxnId(v){
    // Heuristic: PayPal IDs are alphanumeric; this prevents "123" and random junk
    return /^[A-Z0-9]{10,30}$/i.test((v || "").trim());
  }

  function updateLock(){
    const ok = looksLikeTxnId(txnInput?.value) && !!confirmPaid?.checked;
    if(afterBtn){
      afterBtn.disabled = !ok;
      afterBtn.style.opacity = ok ? "1" : ".55";
      afterBtn.style.cursor = ok ? "pointer" : "not-allowed";
      afterBtn.textContent = ok ? "שילמתי – המשך" : "שילמתי – המשך (נעול)";
    }
  }

  if(txnInput) txnInput.addEventListener("input", updateLock);
  if(confirmPaid) confirmPaid.addEventListener("change", updateLock);
  updateLock();

  if(afterBtn){
    afterBtn.addEventListener("click", () => {
      const txn = (txnInput?.value || "").trim();
      if(!looksLikeTxnId(txn) || !confirmPaid?.checked){
        alert("כדי להמשיך חייבים להזין Transaction ID תקין ולאשר תשלום.");
        return;
      }
      order.txnId = txn;
      saveOrder(order);
      window.location.href = `success.html?order=${encodeURIComponent(order.orderId)}`;
    });
  }
}

function initSuccess(){
  const order = loadOrder();
  if(!order){ window.location.href = "index.html"; return; }

  setText("okOrder", order.orderId);
  setText("okType", order.typeLabel);
  setText("okAmount", String(order.amount));

  const msg = buildTicket(order);
  const msgEl = document.getElementById("ticketMsg");
  if (msgEl) msgEl.textContent = msg;

  const copyBtn = document.getElementById("copyBtn");
  if (copyBtn){
    copyBtn.addEventListener("click", async () => {
      try{
        await navigator.clipboard.writeText(msg);
        copyBtn.textContent = "הועתק ✅";
        setTimeout(()=> copyBtn.textContent = "העתק הודעה", 1200);
      }catch{
        alert("לא הצלחתי להעתיק. תסמן ידנית ותעשה Copy.");
      }
    });
  }
}

(() => {
  const t = (document.title || "").toLowerCase();
  if (t.includes("unban") && !t.includes("checkout") && !t.includes("done")) initIndex();
  if (t.includes("checkout")) initPay();
  if (t.includes("done")) initSuccess();
})();
