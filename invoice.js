// invoice.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Supabase setup
const SUPABASE_URL = "https://dhcgvxqyyrxldmczhznx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoY2d2eHF5eXJ4bGRtY3poem54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NTY2MzcsImV4cCI6MjA3MzEzMjYzN30.dCXQeAud1xPW4fmX2YuvIO6bmmr5qTB5Zs92YRLM4VQ";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elements
const partySelect = document.getElementById("partySelect");
const billTo = document.getElementById("billTo");
const gstnDisplay = document.createElement("div"); 
gstnDisplay.style.marginTop = "5px";
billTo.parentNode.appendChild(gstnDisplay);

const billNo = document.getElementById("billNo");
const billDate = document.getElementById("billDate");
const panInput = document.getElementById("gstn");
const sacInput = document.getElementById("sac");
const itemBody = document.getElementById("itemBody");
const subTotalEl = document.getElementById("subTotal");
const detention = document.getElementById("detention");
const loading = document.getElementById("loading");
const unloading = document.getElementById("unloading");
const grandTotalEl = document.getElementById("grandTotal");
const inWords = document.getElementById("inWords");
const saveButton = document.getElementById("saveButton");
const loadButton = document.getElementById("loadButton");
const loadBillNo = document.getElementById("loadBillNo");
const addRowBtn = document.getElementById("addRowBtn");
const removeRowBtn = document.getElementById("removeRowBtn");

// ✅ Load parties into dropdown
async function loadParties() {
  const { data, error } = await supabase.from("parties").select("*");
  if (error) {
    console.error("Error loading parties:", error);
    return;
  }

  partySelect.innerHTML = `<option value="">-- Select Party --</option>`;
  data.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    opt.dataset.address = p.address;
    opt.dataset.gstn = p.gstn || "";
    partySelect.appendChild(opt);
  });
}

// ✅ On party change → fill address & show GSTN
partySelect.addEventListener("change", () => {
  const selected = partySelect.options[partySelect.selectedIndex];
  if (selected.value) {
    billTo.value = selected.dataset.address;
    gstnDisplay.innerHTML = `<strong>Party GSTN:</strong> ${selected.dataset.gstn || "N/A"}`;
  } else {
    billTo.value = "";
    gstnDisplay.innerHTML = "";
  }
});

// ✅ Add item row
addRowBtn.addEventListener("click", () => {
  const rowCount = itemBody.rows.length + 1;
  const row = itemBody.insertRow();
  row.innerHTML = `
    <td>${rowCount}</td>
    <td class="lr-col">
      <input type="text" placeholder="LR No"><br>
      <input type="text" placeholder="dd-mm-yyyy">
    </td>
    <td><input type="text" placeholder="Vehicle"></td>
    <td class="from-to">
      <input type="text" placeholder="From"><br>
      <input type="text" placeholder="To">
    </td>
    <td><input type="text" placeholder="Product"></td>
    <td><input type="text" placeholder="Qty"></td>
    <td><input type="number" name="amount" placeholder="Amount"></td>
  `;
});

// ✅ Remove last row
removeRowBtn.addEventListener("click", () => {
  if (itemBody.rows.length > 1) {
    itemBody.deleteRow(itemBody.rows.length - 1);
  }
});

// ✅ Calculate totals
function calculateTotals() {
  let subTotal = 0;
  document.querySelectorAll("#itemBody input[name='amount']").forEach(input => {
    subTotal += parseFloat(input.value) || 0;
  });

  subTotalEl.textContent = `₹${subTotal.toFixed(2)}`;

  const det = parseFloat(detention.value) || 0;
  const load = parseFloat(loading.value) || 0;
  const unload = parseFloat(unloading.value) || 0;

  const grandTotal = subTotal + det + load + unload;
  grandTotalEl.textContent = `₹${grandTotal.toFixed(2)}`;

  inWords.textContent = numberToWords(grandTotal);
}

document.addEventListener("input", calculateTotals);

// ✅ Number to words (Indian system)
function numberToWords(num) {
  if (num === 0) return "Rupees Zero Only";

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
    "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertToWords(n) {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convertToWords(n % 100) : "");
    return "";
  }

  function indianNumberWords(n) {
    if (n === 0) return "";
    let str = "";

    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    if (crore) str += convertToWords(crore) + " Crore ";

    const lakh = Math.floor(n / 100000);
    n %= 100000;
    if (lakh) str += convertToWords(lakh) + " Lakh ";

    const thousand = Math.floor(n / 1000);
    n %= 1000;
    if (thousand) str += convertToWords(thousand) + " Thousand ";

    const hundred = Math.floor(n / 100);
    n %= 100;
    if (hundred) str += convertToWords(hundred) + " Hundred ";

    if (n > 0) str += convertToWords(n);

    return str.trim();
  }

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let words = "Rupees " + indianNumberWords(integerPart);
  if (decimalPart > 0) {
    words += " and " + indianNumberWords(decimalPart) + " Paise";
  }
  return words + " Only";
}

// ✅ Save invoice
saveButton.addEventListener("click", async () => {
  const items = [];
  itemBody.querySelectorAll("tr").forEach(row => {
    const inputs = row.querySelectorAll("input");
    items.push({
      lr_no: inputs[0].value,
      lr_date: inputs[1].value,
      vehicle: inputs[2].value,
      from: inputs[3].value,
      to: inputs[4].value,
      product: inputs[5].value,
      qty: inputs[6].value,
      amount: inputs[7].value
    });
  });

  const invoice = {
    bill_no: billNo.value,
    bill_date: billDate.value,
    party_id: partySelect.value,
    bill_to: billTo.value,
    pan: panInput.value,
    sac: sacInput.value,
    detention: detention.value,
    loading: loading.value,
    unloading: unloading.value,
    items,
    total: grandTotalEl.textContent
  };

  const { error } = await supabase.from("invoices").insert([invoice]);
  if (error) {
    console.error("Error saving invoice:", error);
    alert("Error saving invoice!");
  } else {
    alert("Invoice saved successfully!");
  }
});

// ✅ Load invoice
loadButton.addEventListener("click", async () => {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("bill_no", loadBillNo.value)
    .single();

  if (error || !data) {
    alert("Invoice not found!");
    return;
  }

  billNo.value = data.bill_no;
  billDate.value = data.bill_date;
  partySelect.value = data.party_id;
  billTo.value = data.bill_to;
  panInput.value = data.pan;
  sacInput.value = data.sac;
  detention.value = data.detention;
  loading.value = data.loading;
  unloading.value = data.unloading;

  itemBody.innerHTML = "";
  data.items.forEach((item, i) => {
    const row = itemBody.insertRow();
    row.innerHTML = `
      <td>${i + 1}</td>
      <td class="lr-col">
        <input type="text" value="${item.lr_no}"><br>
        <input type="text" value="${item.lr_date}">
      </td>
      <td><input type="text" value="${item.vehicle}"></td>
      <td class="from-to">
        <input type="text" value="${item.from}"><br>
        <input type="text" value="${item.to}">
      </td>
      <td><input type="text" value="${item.product}"></td>
      <td><input type="text" value="${item.qty}"></td>
      <td><input type="number" name="amount" value="${item.amount}"></td>
    `;
  });

  calculateTotals();
});

// Init
loadParties();
calculateTotals();
