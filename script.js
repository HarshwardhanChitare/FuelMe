const STORAGE_KEY_PREFIX = "fuelMeTransactionsV4:";
const ACCOUNTS_KEY = "fuelMeAccountsV4";
const SESSION_KEY = "fuelMeActiveAccountV4";
const LEGACY_PROFILE_KEY = "fuelMeProfileV2";
const LEGACY_SESSION_KEY = "fuelMeSignedInV2";
const FUEL_RATES = { Petrol: 110, Diesel: 100 }; // Petrol ₹110/L, Diesel ₹100/L

let selectedPayment = "UPI";
let selectedFuelType = "Petrol";
let currentPump = "PUMP001";
let currentAmount = 500;
let paymentAuthorized = false;
let authorizedAmountPaise = null;
let requestedAmountPaise = null;
let currentTransaction = null;
let dispensingTimer = null;
let historyFilter = "All";
let editingAccountId = null;

const screens = [
  "splashScreen","loginScreen","homeScreen","scannerScreen","paymentScreen",
  "authorizationScreen","successScreen","dispensingScreen","completeScreen",
  "receiptScreen","historyScreen","profileScreen","failureScreen"
];

function loadAccounts(){
  try{
    const data = JSON.parse(localStorage.getItem(ACCOUNTS_KEY));
    return data && typeof data === "object" ? data : {};
  }catch(e){ return {}; }
}

function saveAccounts(accounts){
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function makeAccountId(profile){
  const identity = `${String(profile.mobile || '').trim()}|${String(profile.email || '').trim().toLowerCase()}`;
  let hash = 2166136261;
  for(let i=0;i<identity.length;i++){
    hash ^= identity.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return 'FMU-' + (hash >>> 0).toString(36).toUpperCase();
}

function migrateLegacyAccount(){
  if(localStorage.getItem(ACCOUNTS_KEY)) return;
  try{
    const old = JSON.parse(localStorage.getItem(LEGACY_PROFILE_KEY));
    if(!old || !old.mobile || !old.email) return;
    const accountId = makeAccountId(old);
    const profile = {...old, accountId};
    saveAccounts({[accountId]: profile});
    // Do NOT migrate legacy transaction arrays. Older versions could contain
    // shared/demo records, so importing them would risk cross-account leakage.
    // New V4 accounts start with a clean, private history.
    if(localStorage.getItem(LEGACY_SESSION_KEY) === "true") localStorage.setItem(SESSION_KEY, accountId);
  }catch(e){}
}

function activeAccountId(){ return localStorage.getItem(SESSION_KEY) || null; }

function accountKey(profile = getProfile()){
  return profile?.accountId || (profile ? makeAccountId(profile) : null);
}

function getProfile(){
  migrateLegacyAccount();
  const id = activeAccountId();
  if(!id) return null;
  const accounts = loadAccounts();
  return accounts[id] || null;
}

function isSignedIn(){
  const id = activeAccountId();
  return !!id && !!loadAccounts()[id];
}

function transactionStorageKey(){
  const key = accountKey();
  return key ? STORAGE_KEY_PREFIX + key : null;
}

function requireAccount(){
  if(isSignedIn()) return true;
  alert("Please create or sign in to a Fuel Me account before fueling.");
  openLogin();
  return false;
}

function setAccountOnlyVisibility(signedIn){
  document.querySelectorAll(".account-only").forEach(el => {
    el.classList.toggle("hidden", !signedIn);
  });
}

function updateAccountUI(){
  const profile = getProfile();
  const signedIn = isSignedIn();
  if(signedIn && profile) accountKey(profile);
  setAccountOnlyVisibility(signedIn);
  const gate = document.getElementById("accountGate");
  const scan = document.getElementById("scanBanner");
  const scanText = document.getElementById("scanBannerText");
  const homeGreeting = document.getElementById("homeGreeting");
  const homeAvatar = document.getElementById("homeAvatar");
  const avatar = document.getElementById("profileAvatar");
  const displayName = document.getElementById("profileDisplayName");
  const status = document.getElementById("profileStatus");
  const statusTitle = document.getElementById("profileStatusTitle");
  const statusText = document.getElementById("profileStatusText");
  const signOut = document.getElementById("signOutBtn");
  const saveBtn = document.querySelector(".profile-save-btn");

  if(homeGreeting) homeGreeting.textContent = signedIn && profile ? `${profile.name.split(" ")[0]}!` : "Guest!";
  if(homeAvatar) homeAvatar.textContent = signedIn && profile ? profile.name.charAt(0).toUpperCase() : "G";

  if(gate) gate.classList.toggle("hidden", signedIn);
  if(scan){
    scan.classList.toggle("locked", !signedIn);
    scan.setAttribute("aria-disabled", String(!signedIn));
  }
  if(scanText) scanText.innerHTML = signedIn
    ? "Scan the unique QR code<br>at the fuel pump to start"
    : "Account required<br>Complete your profile to fuel";

  if(avatar) avatar.textContent = signedIn && profile ? profile.name.charAt(0).toUpperCase() : "G";
  if(displayName) displayName.textContent = signedIn && profile ? profile.name : "Complete your profile";
  if(status) status.textContent = signedIn ? "Active Fuel Me customer account" : "Account setup required before fueling";
  if(statusTitle) statusTitle.textContent = signedIn ? "Account active" : "Profile incomplete";
  if(statusText) statusText.textContent = signedIn
    ? "Your profile is verified for this prototype. Your fueling, history and payment choices are kept under this account."
    : "Add your details to unlock self-service fueling.";
  if(signOut) signOut.classList.toggle("hidden", !signedIn);
  if(saveBtn) saveBtn.textContent = signedIn ? "Update Profile" : "Save & Activate Account";
}

function loadProfileForm(){
  const profile = getProfile();
  if(!profile) return;
  document.getElementById("profileName").value = profile.name || "";
  document.getElementById("profileMobile").value = profile.mobile || "";
  document.getElementById("profileEmail").value = profile.email || "";
  document.getElementById("profileVehicle").value = profile.vehicle || "";
  document.getElementById("profileVehicleType").value = profile.vehicleType || "";
}

function saveProfile(event){
  event.preventDefault();
  const name = document.getElementById("profileName").value.trim().replace(/\s+/g," ");
  const mobile = document.getElementById("profileMobile").value.replace(/\D/g,"");
  const email = document.getElementById("profileEmail").value.trim().toLowerCase();
  const vehicle = document.getElementById("profileVehicle").value.trim().toUpperCase().replace(/\s+/g,"");
  const vehicleType = document.getElementById("profileVehicleType").value;

  if(name.length < 2){ alert("Please enter your full name."); return; }
  if(!/^[6-9]\d{9}$/.test(mobile)){ alert("Please enter a valid 10-digit Indian mobile number."); return; }
  if(!/^\S+@\S+\.\S+$/.test(email)){ alert("Please enter a valid email address."); return; }
  if(!/^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{3,4}$/.test(vehicle)){
    alert("Please enter a valid vehicle number, e.g. MP09AB1234."); return;
  }
  if(!vehicleType){ alert("Please select your vehicle type."); return; }

  const accounts = loadAccounts();
  const newAccountId = makeAccountId({mobile,email});
  const now = new Date().toISOString();

  if(editingAccountId && editingAccountId !== newAccountId){
    // If login details change during editing, move this customer's history to the new identity.
    const oldKey = STORAGE_KEY_PREFIX + editingAccountId;
    const oldTransactions = localStorage.getItem(oldKey);
    if(oldTransactions) localStorage.setItem(STORAGE_KEY_PREFIX + newAccountId, oldTransactions);
    delete localStorage[oldKey];
    delete accounts[editingAccountId];
  }

  const previous = accounts[newAccountId] || (editingAccountId ? accounts[editingAccountId] : null);
  const profile = {
    accountId:newAccountId,
    name,mobile,email,vehicle,vehicleType,
    paymentMethods:["UPI","Card","Wallet","Cash"],
    createdAt:previous?.createdAt || now,
    updatedAt:now
  };

  accounts[newAccountId] = profile;
  saveAccounts(accounts);
  localStorage.setItem(SESSION_KEY,newAccountId);
  editingAccountId = null;
  updateAccountUI();
  alert("Account activated successfully.");
  goHome();
}

function startNewAccount(){
  editingAccountId = null;
  document.getElementById("profileForm").reset();
  openProfile();
}

function editCurrentProfile(){
  if(!requireAccount()) return;
  editingAccountId = activeAccountId();
  loadProfileForm();
  showScreen("profileScreen");
}

function openLogin(){
  migrateLegacyAccount();
  renderLoginAccounts();
  showScreen("loginScreen");
}

function renderLoginAccounts(){
  const wrap = document.getElementById("savedAccounts");
  if(!wrap) return;
  const accounts = loadAccounts();
  const ids = Object.keys(accounts);
  if(!ids.length){
    wrap.innerHTML = '<div class="empty-state">No saved accounts yet.<br>Create your first Fuel Me account.</div>';
    return;
  }
  wrap.innerHTML = ids.map(id=>{
    const a=accounts[id];
    return `<button class="saved-account" onclick="loginAccount('${escapeHTML(id)}')"><span class="login-avatar">${escapeHTML(a.name.charAt(0).toUpperCase())}</span><span><b>${escapeHTML(a.name)}</b><small>${escapeHTML(a.mobile)} • ${escapeHTML(a.vehicle)}</small></span><strong>›</strong></button>`;
  }).join('');
}

function loginAccount(id){
  const accounts=loadAccounts();
  if(!accounts[id]){ alert("Account not found."); renderLoginAccounts(); return; }
  localStorage.setItem(SESSION_KEY,id);
  editingAccountId=null;
  currentTransaction=null;
  paymentAuthorized=false;
  authorizedAmountPaise=null;
  requestedAmountPaise=null;
  clearInterval(dispensingTimer);
  updateAccountUI();
  goHome();
}

function signOutAccount(){
  if(!isSignedIn()) return;
  if(confirm("Sign out of Fuel Me? Your account and private history will remain saved.")){
    localStorage.removeItem(SESSION_KEY);
    paymentAuthorized=false;
    currentTransaction=null;
    requestedAmountPaise=null;
    authorizedAmountPaise=null;
    clearInterval(dispensingTimer);
    updateAccountUI();
    openLogin();
  }
}

function switchAccount(){
  localStorage.removeItem(SESSION_KEY);
  currentTransaction=null;
  paymentAuthorized=false;
  requestedAmountPaise=null;
  authorizedAmountPaise=null;
  clearInterval(dispensingTimer);
  openLogin();
}

function getTransactions(){
  if(!isSignedIn()) return [];
  const key = transactionStorageKey();
  if(!key) return [];
  try{
    const saved = JSON.parse(localStorage.getItem(key));
    return Array.isArray(saved) ? saved : [];
  }catch(e){
    return [];
  }
}

function saveTransactions(list){
  const key = transactionStorageKey();
  if(!key || !isSignedIn()) return;
  localStorage.setItem(key, JSON.stringify(list));
}

const accountProtectedScreens = new Set([
  "scannerScreen","paymentScreen","authorizationScreen","successScreen",
  "dispensingScreen","completeScreen","receiptScreen","historyScreen"
]);

function showScreen(id){
  if(accountProtectedScreens.has(id) && !isSignedIn()){
    openLogin();
    return;
  }
  screens.forEach(s => document.getElementById(s).classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  updateStatusBarTheme(id);
  window.scrollTo(0,0);
  if(id === "homeScreen") { renderDashboard(); }
  if(id === "historyScreen") { renderHistory(); }
}

function formatDateTime(iso){
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    weekday:"short", day:"2-digit", month:"short", year:"numeric",
    hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false
  });
}

function formatShortDate(iso){
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit", hour12:true
  });
}

function monthKey(iso){
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

function monthLabel(key){
  const [year,month] = key.split("-").map(Number);
  return new Date(year,month-1,1).toLocaleString("en-IN",{month:"long",year:"numeric"});
}

function money(n){
  return "₹" + Number(n).toLocaleString("en-IN",{maximumFractionDigits:0});
}

function generateTransactionId(){
  const stamp = Date.now().toString().slice(-8);
  return "FM" + stamp;
}

function currentMonthTransactions(){
  const now = new Date();
  const key = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  return getTransactions().filter(t => monthKey(t.timestamp) === key);
}

function renderDashboard(){
  const list = getTransactions().sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
  const monthList = currentMonthTransactions();
  const total = monthList.reduce((sum,t)=>sum+Number(t.amount),0);
  const average = monthList.length ? total/monthList.length : 0;

  document.getElementById("monthlyAverage").textContent = money(average);
  document.getElementById("monthlyAverageNote").textContent =
    monthList.length ? `${monthList.length} completed fueling${monthList.length===1?"":"s"} this month` : "No fueling this month";
  document.getElementById("totalTransactions").textContent = monthList.length;
  document.getElementById("transactionMonth").textContent =
    monthList.length ? "Completed this month" : "No transactions this month";

  const recent = document.getElementById("recentTransactions");
  const empty = document.getElementById("homeEmpty");

  if(!list.length){
    recent.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");
  recent.innerHTML = list.slice(0,4).map(transactionHTML).join("");
}

function transactionHTML(t){
  const typeClass = String(t.fuelType).toLowerCase();
  return `
    <div class="transaction" onclick="openTransaction('${t.id}')">
      <div class="tx-icon ${typeClass}">⛽</div>
      <div class="tx-info">
        <b>${escapeHTML(t.fuelType)}</b>
        <span>${escapeHTML(t.pumpId)} • ${escapeHTML(t.method)}</span>
      </div>
      <div class="tx-right">
        <b>${money(t.amount)}</b>
        <span>${formatShortDate(t.timestamp)}</span>
      </div>
      <div class="tx-arrow">›</div>
    </div>`;
}

function escapeHTML(value){
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function renderHistory(){
  const content = document.getElementById("historyContent");
  let list = getTransactions().sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));

  if(historyFilter !== "All"){
    list = list.filter(t => t.fuelType === historyFilter);
  }

  if(!list.length){
    content.innerHTML = `<div class="empty-state">No ${historyFilter==="All"?"completed":historyFilter.toLowerCase()} transactions found.</div>`;
    return;
  }

  const groups = {};
  list.forEach(t => {
    const key = monthKey(t.timestamp);
    if(!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  content.innerHTML = Object.keys(groups).sort().reverse().map(key => `
    <h3 class="month-heading">${monthLabel(key)}</h3>
    ${groups[key].map(transactionHTML).join("")}
    <div class="month-spacer"></div>
  `).join("");
}

function setHistoryFilter(filter, button){
  historyFilter = filter;
  document.querySelectorAll(".filter-row button").forEach(b=>b.classList.remove("active"));
  button.classList.add("active");
  renderHistory();
}

function openTransaction(id){
  if(!requireAccount()) return;
  const t = getTransactions().find(x => x.id === id);
  if(!t) return;
  currentTransaction = {...t};
  populateReceipt(currentTransaction);
  showScreen("receiptScreen");
}

function goHome(){ showScreen("homeScreen"); }
function openScanner(){
  if(!requireAccount()) return;
  showScreen("scannerScreen");
}
function openHistory(){
  if(!requireAccount()) return;
  showScreen("historyScreen");
}
function openProfile(){
  if(isSignedIn()){
    editingAccountId = activeAccountId();
    loadProfileForm();
  } else {
    editingAccountId = null;
    document.getElementById("profileForm").reset();
  }
  updateAccountUI();
  showScreen("profileScreen");
}

function openPayment(){
  if(!requireAccount()) return;
  showScreen("paymentScreen");
}

function simulateScan(){
  if(!requireAccount()) return;
  currentTransaction = null;
  paymentAuthorized = false;
  authorizedAmountPaise = null;
  currentPump = "PUMP001";
  document.getElementById("pumpLabel").textContent = currentPump;
  document.getElementById("fuelAmount").value = currentAmount || 500;
  showScreen("paymentScreen");
}

function selectPayment(button){
  document.querySelectorAll(".payment-option").forEach(b => b.classList.remove("selected"));
  button.classList.add("selected");
  selectedPayment = button.dataset.method;
}

function selectFuelType(button){
  document.querySelectorAll(".fuel-type-option").forEach(b => b.classList.remove("selected"));
  button.classList.add("selected");
  selectedFuelType = button.dataset.fuel;
  document.getElementById("fuelRateNote").textContent = `${selectedFuelType} rate: ₹${FUEL_RATES[selectedFuelType]} / litre`;
  updateFuelQuantityPreview();
}

function updateFuelQuantityPreview(){
  const input = document.getElementById("fuelAmount");
  const amount = Number(input.value);
  const rate = FUEL_RATES[selectedFuelType];
  const preview = document.getElementById("fuelQuantityPreview");
  if(preview){
    preview.textContent = Number.isFinite(amount) && amount > 0
      ? `${(amount / rate).toFixed(2)} Litres`
      : "0.00 Litres";
  }
}

function focusAmount(){
  const input = document.getElementById("fuelAmount");
  input.focus();
  input.select();
}


function startPayment(){
  if(!requireAccount()) return;
  const input = document.getElementById("fuelAmount");
  const amount = Number(input.value);

  if(!Number.isFinite(amount) || amount <= 0){
    alert("Please enter a valid fuel amount.");
    input.focus();
    return;
  }

  // Keep the exact rupee amount entered by the user. Never round or
  // recalculate the payment amount from the fuel quantity.
  // Store the exact rupee amount as integer paise for payment integrity.
  // This prevents a later litre/rate calculation from changing ₹390 to another amount.
  currentAmount = Math.round(amount);
  input.value = String(currentAmount);
  const amountPaise = currentAmount * 100;
  requestedAmountPaise = amountPaise;
  authorizedAmountPaise = amountPaise;
  const rate = FUEL_RATES[selectedFuelType];
  const now = new Date();

  currentTransaction = {
    id: generateTransactionId(),
    customer: getProfile().name,
    vehicle: getProfile().vehicle,
    vehicleType: getProfile().vehicleType,
    pumpId: currentPump,
    amount: currentAmount,
    amountPaise: amountPaise,
    requestedAmountPaise: amountPaise,
    authorizedAmountPaise: amountPaise,
    method: selectedPayment,
    fuelType: selectedFuelType,
    ratePerLitre: rate,
    litres: Number((currentAmount / rate).toFixed(2)),
    timestamp: now.toISOString(),
    status: "AUTHORIZED"
  };
  paymentAuthorized = false;
  updateFuelQuantityPreview();

  document.getElementById("successAmount").textContent = money(currentAmount);
  const authAmount = document.getElementById("authAmount");
  if(authAmount) authAmount.textContent = money(currentAmount);
  document.getElementById("successMethod").textContent = selectedPayment;
  document.getElementById("successTx").textContent = currentTransaction.id;
  document.getElementById("successTime").textContent = formatDateTime(currentTransaction.timestamp);

  showScreen("authorizationScreen");

  // Prototype payment authorization flow. Each verification stage is shown
  // sequentially and remains visible for at least 1 second.
  runAuthorizationFlow();
}

function runAuthorizationFlow(){
  const steps = [
    document.getElementById("authStep1"),
    document.getElementById("authStep2"),
    document.getElementById("authStep3")
  ];
  const labels = ["Verifying Details", "Processing with Bank", "Confirming Transaction"];
  const text = document.getElementById("authorizationText");

  steps.forEach((step, i) => {
    if(!step) return;
    step.classList.remove("done", "current");
    step.querySelector("i").textContent = "";
  });

  let index = 0;

  function activateStep(){
    if(index > 0){
      steps[index - 1].classList.remove("current");
      steps[index - 1].classList.add("done");
      steps[index - 1].querySelector("i").textContent = "✓";
    }

    if(index < steps.length){
      steps[index].classList.add("current");
      text.innerHTML = `Please wait while we securely<br>${labels[index]}...`;
      index++;
      setTimeout(activateStep, 1200);
    } else {
      steps[steps.length - 1].classList.remove("current");
      steps[steps.length - 1].classList.add("done");
      steps[steps.length - 1].querySelector("i").textContent = "✓";
      text.innerHTML = "Payment verified successfully.<br>Preparing your fueling session...";
      paymentAuthorized = true;
      currentTransaction.status = "AUTHORIZED";
      setTimeout(() => showScreen("successScreen"), 500);
    }
  }

  activateStep();
}

function getVehiclePresentation(vehicleType){
  const type = String(vehicleType || "").toLowerCase();
  if(type.includes("four")) return {label:"4 WHEELER", display:"Four Wheeler", emoji:"🚗", className:"four-wheeler"};
  if(type.includes("commercial")) return {label:"COMMERCIAL", display:"Commercial Vehicle", emoji:"🚚", className:"commercial-vehicle"};
  if(type.includes("three")) return {label:"3 WHEELER", display:"Three Wheeler", emoji:"🛺", className:"three-wheeler"};
  return {label:"2 WHEELER", display:"Two Wheeler", emoji:"🏍️", className:"two-wheeler"};
}

function updateVehicleScene(){
  const profile = getProfile();
  const vehicle = getVehiclePresentation(profile?.vehicleType);
  const scene = document.getElementById("vehicleScene");
  const emoji = document.getElementById("vehicleEmoji");
  const badge = document.getElementById("vehicleTypeBadge");
  const cap = document.getElementById("fuelCap");
  const number = document.getElementById("dispenseVehicleNumber");
  const type = document.getElementById("dispenseVehicleType");
  if(scene) scene.className = `vehicle-scene ${vehicle.className}`;
  if(emoji) emoji.textContent = vehicle.emoji;
  if(badge) badge.textContent = vehicle.label;
  if(cap) cap.textContent = vehicle.className === "two-wheeler" ? "●" : "●";
  if(type) type.textContent = vehicle.display;
  if(number) number.textContent = profile?.vehicle || "—";
}

function startDispensing(){
  if(!requireAccount()) return;
  if(!currentTransaction || !paymentAuthorized) return;

  // Payment integrity check: the dispensing amount must exactly match the
  // amount authorized before fueling can begin.
  const transactionPaise = Number(currentTransaction.amountPaise ?? (Number(currentTransaction.amount) * 100));
  const requestedPaise = Number(currentTransaction.requestedAmountPaise ?? transactionPaise);
  if(requestedPaise !== transactionPaise || authorizedAmountPaise !== requestedPaise || Number(currentTransaction.amount) * 100 !== requestedPaise){
    paymentAuthorized = false;
    alert("Payment authorization mismatch. Fueling has been blocked for your safety.");
    showScreen("failureScreen");
    return;
  }

  updateVehicleScene();
  showScreen("dispensingScreen");

  document.getElementById("dispenseAmount").textContent = currentTransaction.amount;
  document.getElementById("dispensePump").textContent = currentTransaction.pumpId;
  document.getElementById("dispenseFuelType").textContent = currentTransaction.fuelType;
  document.getElementById("volume").textContent = currentTransaction.litres.toFixed(2);

  let progress = 0;
  const bar = document.getElementById("progressBar");
  const percent = document.getElementById("progressPercent");
  const finish = document.getElementById("finishBtn");

  bar.style.width = "0%";
  percent.textContent = "0%";
  finish.classList.add("hidden");
  clearInterval(dispensingTimer);

  // Slower prototype dispensing animation: about 10 seconds instead of ~4 seconds.
  dispensingTimer = setInterval(() => {
    progress += 1;
    bar.style.width = Math.min(progress,100) + "%";
    percent.textContent = Math.min(progress,100) + "%";

    if(progress >= 100){
      clearInterval(dispensingTimer);
      finish.classList.remove("hidden");
    }
  }, 100);
}

function finishFueling(){
  if(!requireAccount()) return;
  if(!currentTransaction) return;

  const transactionPaise = Number(currentTransaction.amountPaise ?? (Number(currentTransaction.amount) * 100));
  const requestedPaise = Number(currentTransaction.requestedAmountPaise ?? transactionPaise);
  if(requestedPaise !== transactionPaise || authorizedAmountPaise !== requestedPaise || Number(currentTransaction.amount) * 100 !== requestedPaise){
    alert("Payment amount verification failed. The transaction was not recorded.");
    return;
  }

  currentTransaction.status = "SUCCESS";

  clearInterval(dispensingTimer);

  // Add to history ONLY after successful fueling is completed.
  const list = getTransactions();
  const alreadyExists = list.some(t => t.id === currentTransaction.id);

  if(!alreadyExists){
    list.unshift(currentTransaction);
    saveTransactions(list);
  }

  document.getElementById("completePump").textContent = currentTransaction.pumpId;
  document.getElementById("completeAmount").textContent = currentTransaction.amount;
  document.getElementById("completeVolume").textContent = currentTransaction.litres.toFixed(2);
  document.getElementById("completeFuelType").textContent = currentTransaction.fuelType;

  showScreen("completeScreen");
}

function populateReceipt(t){
  document.getElementById("receiptCustomer").textContent = t.customer || "Guest";
  document.getElementById("receiptVehicle").textContent = t.vehicle || "—";
  document.getElementById("receiptPump").textContent = t.pumpId;
  document.getElementById("receiptAmount").textContent = money(t.amount);
  document.getElementById("receiptMethod").textContent = t.method;
  document.getElementById("receiptVolume").textContent = `${Number(t.litres).toFixed(2)} Litres`;
  document.getElementById("receiptTime").textContent = formatDateTime(t.timestamp);
  document.getElementById("receiptTx").textContent = t.id;
  document.getElementById("receiptTotal").textContent = money(t.amount);
  document.getElementById("receiptShortId").textContent = t.id.slice(-8);
}

function openReceipt(){
  if(!currentTransaction) return;
  populateReceipt(currentTransaction);
  showScreen("receiptScreen");
}

function downloadReceipt(){
  if(!currentTransaction) return;

  const t = currentTransaction;
  const receiptText = `
FUEL ME
DIGITAL FUEL RECEIPT
------------------------------
Customer Name : ${t.customer}
Vehicle No.   : ${t.vehicle || "—"}
Pump ID       : ${t.pumpId}
Amount Paid   : ${money(t.amount)}
Payment Mode  : ${t.method}
Fuel Quantity : ${Number(t.litres).toFixed(2)} Litres
Fuel Type     : ${t.fuelType}
Rate          : ${money(t.ratePerLitre || FUEL_RATES[t.fuelType] || 110)} / litre
Date & Time   : ${formatDateTime(t.timestamp)}
Transaction ID: ${t.id}
Status        : SUCCESS
------------------------------
Fuel smart • Fuel fast • Go further.
`;

  // Browser print dialog lets the student save the receipt as PDF.
  const win = window.open("", "_blank");
  if(!win){
    alert("Please allow pop-ups to print the receipt.");
    return;
  }
  win.document.write(`
    <html><head><title>Fuel Me Receipt</title>
    <style>
      body{font-family:Arial,sans-serif;padding:30px;max-width:520px;margin:auto;color:#17314d}
      h1{text-align:center;margin-bottom:5px}h3{text-align:center;color:#087ff5}
      pre{font:15px/1.8 monospace;white-space:pre-wrap;border:1px dashed #aaa;padding:20px;border-radius:12px}
    </style></head>
    <body><h1>⛽ Fuel Me</h1><h3>DIGITAL FUEL RECEIPT</h3><pre>${escapeHTML(receiptText)}</pre></body></html>
  `);
  win.document.close();
  win.focus();
  setTimeout(()=>win.print(),250);
}

function resetPrototypeData(){
  if(!requireAccount()) return;
  if(confirm("Clear your Fuel Me transaction history for this account?")){
    saveTransactions([]);
    currentTransaction = null;
    paymentAuthorized = false;
    renderDashboard();
    renderHistory();
    alert("Your account history has been cleared. No other customer's data is affected.");
  }
}


/* ---------- Clean iPhone-style chrome (no Dynamic Island / gestures) ---------- */
function setIsland(){ /* Dynamic Island intentionally removed. */ }
function setupIPhoneGestures(){ /* Gesture navigation intentionally removed. */ }

function updateStatusBarTheme(screenId){
  const bar = document.getElementById("iosStatusBar");
  if(!bar) return;
  const lightScreens = new Set(["paymentScreen","completeScreen","receiptScreen","profileScreen"]);
  bar.classList.toggle("light", lightScreens.has(screenId));
}

function updateStatusBarTime(){
  const el = document.getElementById("iosTime");
  if(!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString("en-IN", {hour:"2-digit", minute:"2-digit", hour12:false});
}

function initApp(){
  updateStatusBarTime();
  setInterval(updateStatusBarTime, 30000);
  migrateLegacyAccount();
  updateAccountUI();
  updateStatusBarTheme("splashScreen");
  // Keep the splash for exactly one second, then continue automatically.
  setTimeout(()=>{
    if(isSignedIn()) goHome();
    else openLogin();
  },1000);
}

document.addEventListener("DOMContentLoaded", () => {
  const amountInput = document.getElementById("fuelAmount");
  if(amountInput) amountInput.addEventListener("input", updateFuelQuantityPreview);
  initApp();
});
