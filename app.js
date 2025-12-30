const CONFIG = {
  // PayPal.me username (לינק תשלום מהיר)
  PAYPAL_ME_USERNAME: "sendhereEzekiel",
  // Bit locked for now
  BIT_PAYMENT_URL: "CHANGE_ME"
};

const PRICES = { cheater: 15, troller: 10 };
const LABELS = { cheater: "צ׳יטרים", troller: "טרולרים" };

// --------------------
// Utils
// --------------------
function makeOrderId(){
  const n = Math.floor(100000 + Math.random() * 900000);
  return "PG-" + n;
}
function saveOrder(order){
  localStorage.setItem("pg_order", JSON.stringify(order));
}
function loadOrder(){
  try { return JSON.parse(localStorage.getItem("pg_order") || "null"); }
  catch { return null; }
}
function setText(id, v){
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}

// --------------------
// Ticket builder
// --------------------
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

// --------------------
// Payment links
// --------------------
function buildPayPalLink(amount){
  if (!CONFIG.PAYPAL_ME_USERNAME || CONFIG.PAYPAL_ME_USERNAME.startsWith("CHANGE_ME")) return "";
  return `https://www.paypal.me/${encodeURIComponent(CONFIG.PAYPAL_ME_USERNAME)}/${encodeURIComponent(amount)}`;
}

// --------------------
// INDEX (order form)
// --------------------
function initIndex(){
  const typeSel = document.getElementById("type");
  const priceEl = document.getElementById("price");
  const form = document.getElementById("orderForm");
  if(!typeSel || !priceEl || !form) return;

  const updatePrice = () => {
    const amt = Number(PRICES[typeSel.value] ?? 0);
    priceEl.textContent = String(amt);
  };

  typeSel.addEventListener("change", updatePrice);
  updatePrice();

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
      txnId: ""
    };

    saveOrder(order);
    window.location.href = "pay.html";
  });
}

// --------------------
// PAY (checkout)
// --------------------
function initPay(){
  const order = loadOrder();
  if(!order){
    window.location.href = "index.html";
    return;
  }

  setText("orderId", order.orderId);
  setText("typeLabel", order.typeLabel);
  setText("amount", String(order.amount));

  const paypalBtn = document.getElementById("paypalBtn");
  const txnInput = document.getElementById("txnId");
  const confirmPaid = document.getElementById("confirmPaid");
  const afterBtn = document.getElementById("afterPayBtn");

  // PayPal button
  const paypalLink = buildPayPalLink(order.amount);
  if (paypalBtn){
    if (paypalLink){
      paypalBtn.href = paypalLink;
      paypalBtn.target = "_blank";
      paypalBtn.rel = "noopener";
    } else {
      paypalBtn.addEventListener("click", (e) => {
        e.preventDefault();
        alert("PayPal לא מחובר. בדוק PAYPAL_ME_USERNAME בקובץ app.js");
      });
    }
  }

  // Validation
  function looksLikeTxnId(v){
    return /^[A-Z0-9]{10,30}$/i.test((v || "").trim());
  }

  function updateLock(){
    const ok = looksLikeTxnId(txnInput?.value) && confirmPaid?.checked;
    if(afterBtn){
      afterBtn.disabled = !ok;
      afterBtn.style.opacity = ok ? "1" : ".55";
      afterBtn.style.cursor = ok ? "pointer" : "not-allowed";
      afterBtn.textContent = ok ? "שילמתי – המשך" : "שילמתי – המשך (נעול)";
    }
  }

  txnInput?.addEventListener("input", updateLock);
  confirmPaid?.addEventListener("change", updateLock);
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
      window.location.href = "success.html";
    });
  }
}

// --------------------
// SUCCESS
// --------------------
function initSuccess(){
  const order = loadOrder();
  if(!order){
    window.location.href = "index.html";
    return;
  }

  setText("okOrder", order.orderId);
  setText("okType", order.typeLabel);
  setText("okAmount", String(order.amount));

  const msg = buildTicket(order);
  const msgEl = document.getElementById("ticketMsg");
  if (msgEl) msgEl.textContent = msg;

  const copyBtn = document.getElementById("copyBtn");
  copyBtn?.addEventListener("click", async () => {
    try{
      await navigator.clipboard.writeText(msg);
      copyBtn.textContent = "הועתק ✅";
      setTimeout(()=> copyBtn.textContent = "העתק הודעה", 1200);
    }catch{
      alert("לא הצלחתי להעתיק. תסמן ידנית ותעשה Copy.");
    }
  });
}

// --------------------
// Router
// --------------------
(() => {
  const t = document.title.toLowerCase();
  if (t.includes("checkout")) initPay();
  else if (t.includes("done") || t.includes("success")) initSuccess();
  else initIndex();
})();
