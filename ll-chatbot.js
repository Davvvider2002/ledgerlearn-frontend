/**
 * LedgerLearn Pro — AI Chatbot Widget (ll-chatbot.js)
 * =====================================================
 * Floating chatbot visible on all pages.
 * Powered by Claude API. Region-aware. Context-aware.
 * Include on any page: <script src="/ll-chatbot.js"></script>
 */
(function() {
  'use strict';

  // ── Config ───────────────────────────────────────────────
  var CHATBOT_ENDPOINT = '/.netlify/functions/ai';
  var MAX_HISTORY      = 10; // messages to keep in context

  // ── State ────────────────────────────────────────────────
  var history  = [];
  var isOpen   = false;
  var isTyping = false;

  // ── Region & user context ─────────────────────────────────
  function getCtx() {
    var user = {}; var prog = {};
    try { user = JSON.parse(localStorage.getItem('ll_user')||'{}'); } catch(e){}
    try { prog = JSON.parse(localStorage.getItem('ll_progress')||'{}'); } catch(e){}
    var R = {
      UK:{label:'United Kingdom',tax:'VAT',taxRate:'20%',taxBody:'HMRC',currency:'£'},
      ZA:{label:'South Africa',tax:'VAT',taxRate:'15%',taxBody:'SARS',currency:'R'},
      NG:{label:'Nigeria',tax:'VAT',taxRate:'7.5%',taxBody:'FIRS',currency:'₦'},
      US:{label:'United States',tax:'Sales Tax',taxRate:'varies',taxBody:'IRS',currency:'$'},
      AU:{label:'Australia',tax:'GST',taxRate:'10%',taxBody:'ATO',currency:'A$'},
      NZ:{label:'New Zealand',tax:'GST',taxRate:'15%',taxBody:'IRD',currency:'NZ$'},
      IE:{label:'Ireland',tax:'VAT',taxRate:'23%',taxBody:'Revenue',currency:'€'},
      AE:{label:'UAE',tax:'VAT',taxRate:'5%',taxBody:'FTA',currency:'AED'},
      CA:{label:'Canada',tax:'GST/HST',taxRate:'5-15%',taxBody:'CRA',currency:'CA$'},
      GLOBAL:{label:'Global',tax:'Tax',taxRate:'varies',taxBody:'Tax Authority',currency:''},
    };
    var region = user.region || 'UK';
    var rc = R[region] || R['UK'];
    var completed = prog.completedLevels || [];
    var level = completed.includes('l2') ? 'L2 Xero Professional' :
                completed.includes('l1') ? 'L1 Xero Associate (passed, working on L2)' :
                'L1 Xero Associate (in progress)';
    return { user, prog, rc, region, level, page: window.location.pathname };
  }

  function systemPrompt() {
    var ctx = getCtx();
    return 'You are LedgerLearn Assistant, a friendly and knowledgeable Xero and bookkeeping expert ' +
      'embedded in LedgerLearn Pro — a Xero certification platform for bookkeepers. ' +
      'The user is: ' + (ctx.user.name||'a learner') + '. ' +
      'Their region: ' + ctx.rc.label + ' (' + ctx.region + '). ' +
      'Tax system: ' + ctx.rc.tax + ' at ' + ctx.rc.taxRate + ', administered by ' + ctx.rc.taxBody + '. ' +
      'Currency: ' + ctx.rc.currency + '. ' +
      'Current level: ' + ctx.level + '. ' +
      'Current page: ' + ctx.page + '. ' +
      'LedgerLearn has 3 levels: L1 (free, Xero basics), L2 ($49, advanced), L3 (free after L2, advisory). ' +
      'Help with: Xero features, bookkeeping concepts, tax in their region, navigating the platform, ' +
      'assessment tips, certificate questions. ' +
      'Keep answers concise (3-4 sentences max) unless asked for detail. ' +
      'Always tailor advice to the user\'s region and level. ' +
      'Never make up information — if unsure, say so and suggest checking Xero official docs.';
  }

  // ── Render widget ─────────────────────────────────────────
  function injectStyles() {
    var css = `
#ll-chat-btn{position:fixed;bottom:24px;right:24px;z-index:9999;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#D4A843,#f0c860);border:none;cursor:pointer;box-shadow:0 4px 24px rgba(212,168,67,0.4);display:flex;align-items:center;justify-content:center;transition:all .2s;font-size:1.4rem;}
#ll-chat-btn:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(212,168,67,0.5);}
#ll-chat-btn .ll-notif{position:absolute;top:0;right:0;width:14px;height:14px;background:#1DA98A;border-radius:50%;border:2px solid #fff;display:none;}
#ll-chat-panel{position:fixed;bottom:92px;right:24px;z-index:9998;width:360px;max-height:520px;background:#0B1F3A;border:1px solid rgba(212,168,67,0.3);border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,0.4);display:none;flex-direction:column;overflow:hidden;font-family:'DM Sans',system-ui,sans-serif;}
#ll-chat-panel.open{display:flex;}
.ll-chat-hdr{background:linear-gradient(135deg,#0d2044,#0B1F3A);padding:14px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,0.08);flex-shrink:0;}
.ll-chat-hdr-icon{width:34px;height:34px;border-radius:50%;background:rgba(212,168,67,0.15);border:1px solid rgba(212,168,67,0.3);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;}
.ll-chat-hdr-info{flex:1;}.ll-chat-hdr-name{font-size:0.85rem;font-weight:700;color:#fff;}
.ll-chat-hdr-status{font-size:0.68rem;color:rgba(255,255,255,0.4);display:flex;align-items:center;gap:4px;}
.ll-online-dot{width:6px;height:6px;border-radius:50%;background:#1DA98A;flex-shrink:0;}
.ll-chat-close{background:none;border:none;color:rgba(255,255,255,0.4);font-size:1.1rem;cursor:pointer;padding:2px 6px;border-radius:4px;}
.ll-chat-close:hover{color:#fff;background:rgba(255,255,255,0.08);}
.ll-chat-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth;}
.ll-chat-msgs::-webkit-scrollbar{width:4px;}.ll-chat-msgs::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px;}
.ll-msg{max-width:88%;line-height:1.5;}
.ll-msg-bot{align-self:flex-start;}
.ll-msg-user{align-self:flex-end;}
.ll-msg-bubble{padding:9px 13px;border-radius:12px;font-size:0.82rem;}
.ll-msg-bot .ll-msg-bubble{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.85);border-radius:4px 12px 12px 12px;}
.ll-msg-user .ll-msg-bubble{background:#D4A843;color:#0B1F3A;font-weight:600;border-radius:12px 4px 12px 12px;}
.ll-msg-time{font-size:0.62rem;color:rgba(255,255,255,0.3);margin-top:3px;padding:0 4px;}
.ll-msg-user .ll-msg-time{text-align:right;}
.ll-typing{display:flex;gap:4px;align-items:center;padding:9px 13px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);border-radius:4px 12px 12px 12px;width:fit-content;}
.ll-typing span{width:6px;height:6px;background:rgba(255,255,255,0.4);border-radius:50%;animation:ll-bounce .8s infinite;}
.ll-typing span:nth-child(2){animation-delay:.15s;}.ll-typing span:nth-child(3){animation-delay:.3s;}
@keyframes ll-bounce{0%,80%,100%{transform:translateY(0);}40%{transform:translateY(-5px);}}
.ll-chat-suggestions{padding:6px 12px;display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,0.06);flex-shrink:0;}
.ll-chip{padding:4px 10px;border-radius:100px;background:rgba(212,168,67,0.1);border:1px solid rgba(212,168,67,0.25);color:#D4A843;font-size:0.7rem;cursor:pointer;transition:all .15s;white-space:nowrap;}
.ll-chip:hover{background:rgba(212,168,67,0.2);}
.ll-chat-input-row{display:flex;gap:6px;padding:10px 12px;border-top:1px solid rgba(255,255,255,0.08);flex-shrink:0;}
#ll-chat-input{flex:1;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#fff;padding:9px 12px;font-size:0.82rem;font-family:inherit;outline:none;resize:none;height:38px;max-height:80px;overflow-y:auto;}
#ll-chat-input::placeholder{color:rgba(255,255,255,0.3);}
#ll-chat-input:focus{border-color:rgba(212,168,67,0.5);}
#ll-chat-send{width:36px;height:36px;border-radius:8px;background:#D4A843;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;}
#ll-chat-send:hover{background:#f0c860;}
#ll-chat-send svg{width:16px;height:16px;}
@media(max-width:420px){#ll-chat-panel{width:calc(100vw - 32px);right:16px;}#ll-chat-btn{right:16px;bottom:16px;}}
`;
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildWidget() {
    var ctx = getCtx();
    var regionLabel = ctx.rc.label;

    // Fab button
    var btn = document.createElement('button');
    btn.id = 'll-chat-btn';
    btn.title = 'LedgerLearn Assistant';
    btn.innerHTML = '<span>💬</span><div class="ll-notif" id="ll-chat-notif"></div>';
    btn.onclick = toggleChat;

    // Panel
    var panel = document.createElement('div');
    panel.id = 'll-chat-panel';
    panel.innerHTML = `
<div class="ll-chat-hdr">
  <div class="ll-chat-hdr-icon">🤖</div>
  <div class="ll-chat-hdr-info">
    <div class="ll-chat-hdr-name">LedgerLearn Assistant</div>
    <div class="ll-chat-hdr-status"><div class="ll-online-dot"></div> Online · ${regionLabel} region</div>
  </div>
  <button class="ll-chat-close" onclick="window.LLChat.close()" title="Close">✕</button>
</div>
<div class="ll-chat-msgs" id="ll-chat-msgs"></div>
<div class="ll-chat-suggestions" id="ll-chat-chips"></div>
<div class="ll-chat-input-row">
  <textarea id="ll-chat-input" placeholder="Ask about Xero, bookkeeping, your certificate..." rows="1"></textarea>
  <button id="ll-chat-send" onclick="window.LLChat.send()" title="Send">
    <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
  </button>
</div>`;

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    // Input: send on Enter (Shift+Enter for newline)
    document.getElementById('ll-chat-input').addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.LLChat.send(); }
    });

    // Show welcome chips
    showChips(['How do I reconcile my bank in Xero?', 'What is ' + ctx.rc.tax + ' at ' + ctx.rc.taxRate + '?', 'How do I pass the L1 assessment?', 'What\'s in L2?']);

    // Welcome message after short delay
    setTimeout(function() {
      addMessage('bot', 'Hi ' + (ctx.user.name ? ctx.user.name.split(' ')[0] : 'there') + '! 👋 I\'m your LedgerLearn Assistant. I can help with Xero, bookkeeping, your ' + regionLabel + ' region questions, and navigating the platform. What would you like to know?');
      document.getElementById('ll-chat-notif').style.display = 'block';
    }, 1500);
  }

  function showChips(chips) {
    var el = document.getElementById('ll-chat-chips');
    if (!el) return;
    el.innerHTML = chips.map(function(c) {
      return '<button class="ll-chip" onclick="window.LLChat.sendText(\'' + c.replace(/'/g,"\\'") + '\')">' + c + '</button>';
    }).join('');
  }

  function addMessage(role, text, loading) {
    var msgs = document.getElementById('ll-chat-msgs');
    if (!msgs) return null;
    var div = document.createElement('div');
    div.className = 'll-msg ll-msg-' + (role === 'user' ? 'user' : 'bot');
    var time = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    if (loading) {
      div.innerHTML = '<div class="ll-typing"><span></span><span></span><span></span></div>';
    } else {
      div.innerHTML = '<div class="ll-msg-bubble">' + esc(text) + '</div><div class="ll-msg-time">' + time + '</div>';
    }
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  }

  function toggleChat() {
    isOpen = !isOpen;
    var panel = document.getElementById('ll-chat-panel');
    if (panel) panel.classList.toggle('open', isOpen);
    document.getElementById('ll-chat-notif').style.display = 'none';
    if (isOpen) document.getElementById('ll-chat-input') && document.getElementById('ll-chat-input').focus();
  }

  // ── Public API ────────────────────────────────────────────
  window.LLChat = {
    open:  function() { if (!isOpen) toggleChat(); },
    close: function() { if (isOpen) toggleChat(); },

    sendText: function(text) {
      window.LLChat.open();
      document.getElementById('ll-chat-input').value = text;
      window.LLChat.send();
    },

    send: async function() {
      var input = document.getElementById('ll-chat-input');
      if (!input) return;
      var text = input.value.trim();
      if (!text || isTyping) return;

      input.value = '';
      isTyping = true;
      document.getElementById('ll-chat-chips').innerHTML = '';

      // Show user message
      addMessage('user', text);

      // Add to history
      history.push({ role: 'user', content: text });
      if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);

      // Show typing indicator
      var typingEl = addMessage('bot', '', true);

      try {
        var res = await fetch(CHATBOT_ENDPOINT, {
          method:  'POST',
          headers: {'Content-Type': 'application/json'},
          body:    JSON.stringify({
            action:  'chat',
            system:  systemPrompt(),
            messages: history,
          }),
        });
        var data = await res.json();
        var reply = (data && data.text) ? data.text : (data && data.error) ? 'Sorry, I hit an error. Please try again.' : 'Sorry, I didn\'t understand that.';

        // Replace typing with real reply
        if (typingEl && typingEl.parentNode) {
          var time = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
          typingEl.innerHTML = '<div class="ll-msg-bubble">' + esc(reply) + '</div><div class="ll-msg-time">' + time + '</div>';
        }

        history.push({ role: 'assistant', content: reply });

        // Contextual follow-up chips
        var followups = getFollowups(text, reply);
        if (followups.length) showChips(followups);

      } catch(e) {
        if (typingEl && typingEl.parentNode) {
          typingEl.innerHTML = '<div class="ll-msg-bubble">Sorry, something went wrong. Please try again in a moment.</div>';
        }
      }
      isTyping = false;
    }
  };

  function getFollowups(question, reply) {
    var q = question.toLowerCase();
    if (q.includes('reconcil') || q.includes('bank')) {
      return ['What are bank rules?', 'How often should I reconcile?', 'What is a statement line?'];
    }
    if (q.includes('vat') || q.includes('tax') || q.includes('firs') || q.includes('hmrc') || q.includes('sars')) {
      return ['How do I file a return?', 'What is input tax?', 'What are exempt supplies?'];
    }
    if (q.includes('invoice') || q.includes('bill')) {
      return ['How do I create a credit note?', 'What is accounts receivable?', 'How do I mark an invoice paid?'];
    }
    if (q.includes('l1') || q.includes('l2') || q.includes('l3') || q.includes('level')) {
      return ['What topics are in L2?', 'How do I get my certificate?', 'How do I unlock L3?'];
    }
    if (q.includes('cert')) {
      return ['How do I download my certificate?', 'Can I share it on LinkedIn?', 'How do employers verify it?'];
    }
    return ['Tell me about bank reconciliation', 'What is a chart of accounts?', 'How do I pass the assessment?'];
  }

  // ── Init on DOM ready ─────────────────────────────────────
  function init() {
    // Respect page-level suppress flag
    // Set window.LL_NO_CHATBOT = true before this script to disable
    if (window.LL_NO_CHATBOT === true) {
      console.log('[LedgerLearn] Chatbot suppressed on this page ✓');
      return;
    }
    injectStyles();
    buildWidget();
    console.log('[LedgerLearn] Chatbot loaded ✓');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
