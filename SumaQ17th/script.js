const CONFIG_KEY='sumaqReservationConfig';
const RES_KEY='sumaqReservations';
const EVENT_KEY='sumaqEventInquiries';
const DEFAULT_CONFIG={depositRequired:true,adultDeposit:50,minorDeposit:0,currency:'CAD',depositThreshold:4};
const APPS_SCRIPT_URL='';

const toggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('.nav-links');
toggle?.addEventListener('click',()=>nav.classList.toggle('open'));
document.querySelectorAll('.nav-links a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));

function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}}
function write(key,value){localStorage.setItem(key,JSON.stringify(value))}
function config(){return {...DEFAULT_CONFIG,...read(CONFIG_KEY,DEFAULT_CONFIG)}}
function money(n){return `$${Number(n||0).toFixed(2)} CAD`}
function uid(){return 'SUMAQ-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7).toUpperCase()}
function totalParty(){const a=Number(document.getElementById('adults')?.value||0);const m=Number(document.getElementById('minors')?.value||0);return {adults:a,minors:m,total:a+m}}
function calculateDeposit(){const p=totalParty();return p.total>4?50:0}
function updatePartyAndPayment(){const p=totalParty();const partySize=document.getElementById('partySize');if(partySize)partySize.value=`${p.total} guest${p.total===1?'':'s'}`;const amount=calculateDeposit();const payBox=document.getElementById('paymentBox');const noPay=document.getElementById('noPaymentBox');const summary=document.getElementById('paymentSummary');if(payBox&&noPay){if(amount>0){payBox.hidden=false;noPay.hidden=true;if(summary)summary.textContent='When you select Book Now, you will continue to the secure payment preview.'}else{payBox.hidden=true;noPay.hidden=false}}}
['adults','minors'].forEach(id=>document.getElementById(id)?.addEventListener('input',updatePartyAndPayment));
updatePartyAndPayment();

async function sendOptionalWebhook(type,data){if(!APPS_SCRIPT_URL)return;try{await fetch(APPS_SCRIPT_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,data})})}catch(e){console.warn('Webhook not available',e)}}

const reservationForm=document.getElementById('reservationForm');
reservationForm?.addEventListener('submit',async e=>{
  e.preventDefault();
  const submitButton=reservationForm.querySelector('button[type="submit"]');
  const message=document.getElementById('reservationMsg');
  const fd=Object.fromEntries(new FormData(reservationForm).entries());
  const c=config();
  const p=totalParty();
  const deposit=calculateDeposit();
  const reservation={
    id:uid(),
    createdAt:new Date().toISOString(),
    status:deposit>0?'Awaiting deposit':'Booked',
    paymentStatus:deposit>0?'Pending':'No payment required',
    depositRequired:deposit>0,
    depositAmount:deposit,
    depositThreshold:c.depositThreshold||4,
    adults:p.adults,
    minors:p.minors,
    partySize:p.total,
    ...fd
  };

  if(deposit>0){
    sessionStorage.setItem('sumaqPendingReservation',JSON.stringify(reservation));
    if(message)message.textContent='A CAD 50 deposit is required. Opening the secure payment preview…';
    if(submitButton)submitButton.disabled=true;
    window.location.href='reservation-payment.html';
    return;
  }

  const items=read(RES_KEY,[]);
  items.unshift(reservation);
  write(RES_KEY,items);
  await sendOptionalWebhook('reservation',reservation);
  if(message)message.textContent='Reservation booked successfully. No deposit is required for this party size.';
  reservationForm.reset();
  document.getElementById('adults').value='2';
  document.getElementById('minors').value='0';
  updatePartyAndPayment();
});

const eventForm=document.getElementById('eventForm');
eventForm?.addEventListener('submit',async e=>{e.preventDefault();const inquiry={id:uid(),createdAt:new Date().toISOString(),status:'New',...Object.fromEntries(new FormData(eventForm).entries())};const items=read(EVENT_KEY,[]);items.unshift(inquiry);write(EVENT_KEY,items);await sendOptionalWebhook('private_event',inquiry);document.getElementById('eventMsg').textContent='Private event inquiry saved. SumaQ will contact the guest.';eventForm.reset();});

// Keep the public chatbot invitation consistent before and after any interaction.
const SUMAQ_CHAT_PROMPT='Questions? Chat with SumaQ.';
const CHAT_ALTERNATE_PROMPTS=new Set([
  'Hi! How can I assist you?',
  'Hi! How can I assist you today?',
  'How can I assist you?',
  'How can I help you?',
  'Hello! How can I assist you?'
]);

function normalizeChatText(value){
  return String(value||'').replace(/\s+/g,' ').trim();
}

function enforceSumaqChatPrompt(root=document){
  const seen=new Set();
  const visit=node=>{
    if(!node||seen.has(node)) return;
    seen.add(node);

    // Replace matching text in the host page or in open shadow roots created by widgets.
    const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
    let textNode;
    while((textNode=walker.nextNode())){
      const current=normalizeChatText(textNode.nodeValue);
      if(CHAT_ALTERNATE_PROMPTS.has(current)) textNode.nodeValue=SUMAQ_CHAT_PROMPT;
    }

    if(node.querySelectorAll){
      node.querySelectorAll('[aria-label],[title],[placeholder]').forEach(el=>{
        ['aria-label','title','placeholder'].forEach(attr=>{
          const current=normalizeChatText(el.getAttribute(attr));
          if(CHAT_ALTERNATE_PROMPTS.has(current)) el.setAttribute(attr,SUMAQ_CHAT_PROMPT);
        });
        if(el.shadowRoot) visit(el.shadowRoot);
      });
      node.querySelectorAll('*').forEach(el=>{ if(el.shadowRoot) visit(el.shadowRoot); });
    }
  };
  visit(root);

  const nudge=document.querySelector('.chat-nudge span');
  if(nudge && nudge.textContent!==SUMAQ_CHAT_PROMPT) nudge.textContent=SUMAQ_CHAT_PROMPT;
}

const chatPromptObserver=new MutationObserver(()=>enforceSumaqChatPrompt());
chatPromptObserver.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','placeholder']});

['click','pointerup','touchend','keyup','focusin'].forEach(eventName=>{
  document.addEventListener(eventName,()=>{
    enforceSumaqChatPrompt();
    setTimeout(enforceSumaqChatPrompt,50);
    setTimeout(enforceSumaqChatPrompt,300);
    setTimeout(enforceSumaqChatPrompt,1000);
  },true);
});

window.addEventListener('load',()=>{
  enforceSumaqChatPrompt();
  [250,750,1500,3000,6000].forEach(delay=>setTimeout(enforceSumaqChatPrompt,delay));
});
