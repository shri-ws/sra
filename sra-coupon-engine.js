/**
 * ============================================================================
 * श्री राम जी एस्ट्रो (shriramjiastro.in) - चेकआउट व सूत्रधार इंजन
 * ============================================================================
 * नियम (18 नवंबर 2026):
 * 1. दाम केवल सर्वर तय करता है (GST सहित)। पेज सिर्फ़ दिखाते हैं।
 * 2. ग्राहक के लिए कोई कूपन छूट नहीं। हर कोड पर एक ही जवाब: "कोड अमान्य है"।
 *    डेवलपर का टेस्ट कोड केवल सर्वर पहचानता है, केवल डेवलपर के नंबर पर (₹1, कोई कमीशन नहीं)।
 * 3. सूत्रधार का कमीशन 72 घंटे की लीड (ग्राहक का मोबाइल) से अपने आप जुड़ता है।
 * 4. हर भुगतान सर्वर पर बने Razorpay order से होता है, ताकि राशि और लीड सुरक्षित रहें।
 */

(function(window) {
  'use strict';

  var SraCouponEngine = {
    version: '2.0.0',
    STORAGE_KEY: 'sra_sutradhar_ref',
    COUPON_STORAGE_KEY: 'sra_applied_coupon',

    /**
     * URL पैरामीटर्स से रेफरल/कूपन आईडी पढ़ना व सुरक्षित सहेजना
     */
    init: function() {
      try {
        var ref = null;
        if (typeof URLSearchParams !== 'undefined' && window.location && window.location.search) {
          var params = new URLSearchParams(window.location.search);
          ref = params.get('ref') || params.get('coupon') || params.get('sutradhar') || params.get('c') || params.get('agent');
        } else if (window.location && window.location.search) {
          var m = window.location.search.match(/[?&](ref|coupon|sutradhar|c|agent)=([^&#]+)/i);
          if (m && m[2]) ref = decodeURIComponent(m[2]);
        }
        if (ref) {
          ref = ref.trim().toUpperCase();
          if (this.isValidCode(ref)) {
            localStorage.setItem(this.STORAGE_KEY, ref);
            sessionStorage.setItem(this.STORAGE_KEY, ref);
            console.log('[SRA Sutradhar Engine] Active Sutradhar Referral Detected:', ref);
          }
        }
      } catch (e) {
        console.warn('[SRA Sutradhar Engine] Init URL parse warning:', e);
      }
    },

    /**
     * वर्तमान सक्रिय सूत्रधार आईडी प्राप्त करना
     */
    getActiveSutradharId: function() {
      try {
        return localStorage.getItem(this.STORAGE_KEY) || sessionStorage.getItem(this.STORAGE_KEY) || '';
      } catch (e) {
        return '';
      }
    },

    /**
     * रेफ़रल लिंक कोड का प्रारूप जांचना (केवल जानकारी हेतु; कोई छूट नहीं)
     */
    isValidCode: function(rawCode) {
      if (!rawCode) return false;
      var code = String(rawCode).trim().toUpperCase();
      var cleanCode = code.replace(/[-_\s]/g, '');

      // २. सूत्रधार यूनिक कोड प्रारूप (बिना हाइफ़न या हाइफ़न सहित: SRA..., SUTRA..., SD...)
      if (/^SRA[A-Z0-9]{4,10}$/i.test(cleanCode) || /^SRA-[A-Z0-9]{4,10}$/i.test(code) || /^SD-?\d{2,6}$/i.test(code) || /^SUTRA/i.test(code)) return true;

      // ३. लोकल स्टोरेज में मौजूद सक्रिय सूत्रधार प्रोफाइल/सेशन जांच
      try {
        var sess = JSON.parse(localStorage.getItem('sra_sutradhar_session') || '{}');
        if (sess && (sess.sutradhar_id || sess.code)) {
          var sId = (sess.sutradhar_id || '').toUpperCase().replace(/[-_\s]/g, '');
          var sCode = (sess.code || '').toUpperCase().replace(/[-_\s]/g, '');
          if (sId === cleanCode || sCode === cleanCode) return true;
        }
        var prof = JSON.parse(localStorage.getItem('sra_sutradhar_profile') || '{}');
        if (prof && (prof.sutradhar_id || prof.code)) {
          var pId = (prof.sutradhar_id || '').toUpperCase().replace(/[-_\s]/g, '');
          var pCode = (prof.code || '').toUpperCase().replace(/[-_\s]/g, '');
          if (pId === cleanCode || pCode === cleanCode) return true;
        }
      } catch(e) {}
      return false;
    },

    /**
     * सर्वर से रीयल-टाइम मूल्य और स्वचालित डिस्काउंट प्राप्त करना (10% Auto-Attribution)
     * यदि ग्राहक का नंबर किसी सूत्रधार की सक्रिय लीड में है, तो 10% छूट अपने-आप लागू होगी।
     */
    apiBase: function() {
      return (window.SRA_API_BASE || 'https://sra-canonical-engine.onrender.com');
    },

    authHeaders: async function() {
      var headers = { 'Content-Type': 'application/json' };
      try {
        if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
          var token = await firebase.auth().currentUser.getIdToken();
          if (token) headers['Authorization'] = 'Bearer ' + token;
        }
      } catch (authErr) {
        console.warn('[SraCouponEngine] Firebase token notice:', authErr);
      }
      return headers;
    },

    guessPhone: function() {
      try {
        // 1) the number signed in by OTP, 2) a phone box on the page, 3) what an older login saved
        var fu = window.firebase && firebase.auth && firebase.auth().currentUser;
        var fp = String((fu && fu.phoneNumber) || '').replace(/\D/g, '').slice(-10);
        if (fp.length === 10) return fp;
        var el = document.getElementById('mangalPhone') || document.getElementById('inMangalPhone');
        var phone = (el ? el.value : '') || localStorage.getItem('sra_verified_mobile') || localStorage.getItem('sra_user_phone') || '';
        phone = String(phone).split('@')[0].replace(/\D/g, '').slice(-10);
        return phone.length === 10 ? phone : '';
      } catch (e) { return ''; }
    },

    /**
     * सर्वर की दाम-सूची (GST सहित) — एक बार लाकर रख लेते हैं
     */
    _catalog: null,
    loadCatalog: async function() {
      if (this._catalog) return this._catalog;
      try {
        var res = await fetch(this.apiBase() + '/api/sutradhar/catalog');
        if (res.ok) {
          var data = await res.json();
          var map = {};
          (data.items || []).forEach(function(it) { map[it.service_id] = it; });
          this._catalog = map;
        }
      } catch (e) {
        console.warn('[SraCouponEngine] catalog notice:', e);
      }
      return this._catalog || {};
    },

    /**
     * पेज पर [data-sra-price="service_id"] वाले हर तत्व में सर्वर का दाम लिखना
     */
    applyPrices: async function() {
      var cat = await this.loadCatalog();
      document.querySelectorAll('[data-sra-price]').forEach(function(el) {
        var it = cat[el.getAttribute('data-sra-price')];
        if (it) el.textContent = Number(it.price).toLocaleString('en-IN');
      });
    },

    /**
     * सर्वर से दाम पूछना (केवल दिखाने के लिए; असली राशि order बनते समय तय होती है)
     */
    fetchServerQuote: async function(arg1, arg2, inputCode) {
      // Pages call it as (phone, serviceId, code) or (serviceId, phone, code)
      var a1 = String(arg1 || ''), a2 = String(arg2 || '');
      var phone, serviceId;
      if (/^\d{10}$/.test(a2.replace(/\D/g, '').slice(-10)) && !/^\d{10}$/.test(a1.replace(/\D/g, '').slice(-10))) {
        serviceId = a1; phone = a2;
      } else {
        phone = a1; serviceId = a2;
      }
      phone = String(phone || this.guessPhone()).replace(/\D/g, '').slice(-10);
      try {
        var res = await fetch(this.apiBase() + '/api/sutradhar/quote', {
          method: 'POST',
          headers: await this.authHeaders(),
          body: JSON.stringify({ customer_phone: phone, service_id: serviceId, input_code: inputCode || null })
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('[SraCouponEngine] Server quote notice:', err);
      }
      return null;
    },

    /**
     * सर्वर पर सुरक्षित Razorpay order बनाना (राशि, लीड, टेस्ट-कोड सब सर्वर तय करता है)
     */
    createServerOrder: async function(customerPhone, customerEmail, serviceId, inputCode, customerName, extra) {
      var phone = String(customerPhone || this.guessPhone()).replace(/\D/g, '').slice(-10);
      var res = await fetch(this.apiBase() + '/api/sutradhar/orders/create', {
        method: 'POST',
        headers: await this.authHeaders(),
        body: JSON.stringify({
          customer_phone: phone,
          customer_name: customerName || 'जातक',
          customer_email: customerEmail || '',
          service_id: serviceId,
          input_code: inputCode || null,
          batch_id: (extra && extra.batch_id) || null
        })
      });
      if (res.ok) return await res.json();
      var errData = await res.json().catch(function() { return {}; });
      throw new Error(errData.detail || 'ऑर्डर तैयार करने में त्रुटि');
    },

    /**
     * पूरा चेकआउट: सर्वर order बनाओ → Razorpay खोलो → सफल होने पर onSuccess(response, order)
     * o = { serviceId, phone, name, email, code, description, notes, color, onSuccess, onDismiss, onError }
     */
    openServerCheckout: async function(o) {
      o = o || {};
      if (typeof Razorpay === 'undefined') {
        alert('Razorpay पेमेंट गेटवे लोड नहीं हो सका। कृपया इंटरनेट कनेक्शन जांचें व पुनः प्रयास करें।');
        return null;
      }
      var phone = String(o.phone || this.guessPhone()).replace(/\D/g, '').slice(-10);
      var order;
      try {
        order = await this.createServerOrder(phone, o.email, o.serviceId, o.code, o.name);
      } catch (err) {
        if (o.onError) o.onError(err); else alert(err.message || 'भुगतान शुरू नहीं हो सका।');
        return null;
      }
      var notes = Object.assign({ service_id: order.service_id, customer_phone: phone }, o.notes || {});
      var options = {
        key: order.key_id || 'rzp_live_U1a0a504puKK5e',
        amount: order.amount,
        currency: 'INR',
        order_id: order.order_id,
        name: 'Shri Ramji Astro',
        description: (o.description || order.service_name || '') + (order.is_test ? ' [टेस्ट]' : ''),
        prefill: { name: o.name || '', contact: phone, email: o.email || '' },
        notes: notes,
        theme: { color: o.color || '#7c1305' },
        webview_intent: true,   // lets UPI apps (GPay, PhonePe…) show inside the Android app and in-app browsers
        handler: function(response) { window._sraLastOrder = order; if (o.onSuccess) o.onSuccess(response, order); },
        modal: { ondismiss: function() { if (o.onDismiss) o.onDismiss(order); } }
      };
      var rzp = new Razorpay(options);
      rzp.on('payment.failed', function(resp) {
        var msg = (resp && resp.error && resp.error.description) || 'भुगतान असफल रहा।';
        if (o.onError) o.onError(new Error(msg)); else alert(msg);
      });
      rzp.open();
      return order;
    },

    /**
     * पुराने पेजों के लिए: पेज के अपने Razorpay options (handler आदि) रखते हुए
     * राशि, order_id और key सर्वर order से भरकर चेकआउट खोलना।
     * o = { serviceId, options, code, phone, email, name }
     */
    checkoutWithOptions: async function(o) {
      o = o || {};
      var options = o.options || {};
      if (typeof Razorpay === 'undefined') {
        alert('Razorpay पेमेंट गेटवे लोड नहीं हो सका। कृपया इंटरनेट कनेक्शन जांचें व पुनः प्रयास करें।');
        return null;
      }
      var prefill = options.prefill || {};
      var phone = String(o.phone || this.guessPhone() || '').replace(/\D/g, '').slice(-10);
      var order;
      try {
        order = await this.createServerOrder(phone, o.email || prefill.email || '', o.serviceId, o.code, o.name || prefill.name, o.extra);
      } catch (err) {
        alert(err.message || 'भुगतान शुरू नहीं हो सका। कृपया पुनः प्रयास करें।');
        return null;
      }
      options.key = order.key_id || options.key;
      options.amount = order.amount;
      options.currency = 'INR';
      options.order_id = order.order_id;
      options.notes = Object.assign({}, options.notes || {}, {
        service_id: order.service_id, customer_phone: phone, amount: String(order.net_price)
      });
      if (phone) options.prefill = Object.assign({}, prefill, { contact: phone });
      if (order.is_test) options.description = (options.description || '') + ' [टेस्ट]';
      // course seat is held on the server for a few minutes; checkout closes a little before that
      if (order.seat_hold_minutes) options.timeout = Math.max(300, (order.seat_hold_minutes - 3) * 60);
      var userHandler = options.handler;
      options.handler = function(response) {
        window._sraLastOrder = order;
        if (userHandler) userHandler(response, order);
      };
      options.webview_intent = true;   // UPI apps inside the Android app and in-app browsers
      var rzp = new Razorpay(options);
      rzp.on('payment.failed', function(resp) {
        alert('भुगतान असफल रहा: ' + ((resp && resp.error && resp.error.description) || 'कृपया पुनः प्रयास करें।'));
      });
      rzp.open();
      return order;
    },

    /**
     * इस browser/फ़ोन की स्थायी पहचान (SaaS की 2-फ़ोन सीमा के लिए)
     */
    deviceId: function() {
      try {
        var k = 'sra_device_id';
        var v = localStorage.getItem(k);
        if (!v || v.length < 8) {
          v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
          v = v.replace(/[^A-Za-z0-9_-]/g, '');
          localStorage.setItem(k, v);
        }
        return v;
      } catch (e) { return ''; }
    },

    isPhoneCode: function(code) {
      var d = String(code || '').replace(/\D/g, '');
      return d.length === 10 || (d.length === 12 && d.slice(0, 2) === '91');
    },

    /**
     * ज्योतिषी SaaS: अपना ही लॉगिन नंबर कोड में डालने पर रिपोर्ट खोलना (सर्वर जाँचता है)
     */
    redeemSaas: async function(serviceId, code, reportRef) {
      try {
        var res = await fetch(this.apiBase() + '/api/sutradhar/saas/redeem', {
          method: 'POST',
          headers: await this.authHeaders(),
          body: JSON.stringify({ service_id: serviceId, code: code, device_id: this.deviceId(), report_ref: reportRef || '' })
        });
        var data = await res.json().catch(function() { return {}; });
        if (res.ok && data && typeof data.ok === 'boolean') return data;
        return { ok: false, message: 'कोड अमान्य है।' };
      } catch (e) {
        return { ok: false, message: 'नेटवर्क समस्या। कृपया पुनः प्रयास करें।' };
      }
    },

    /**
     * रिपोर्ट पेजों का कोड-बॉक्स:
     * - 10 अंकों का नंबर → SaaS जाँच (लॉगिन नंबर = कोड + चालू सदस्यता + 2 फ़ोन) → onUnlock
     * - बाकी हर कोड → "कोड अमान्य है।" (कोड फिर भी भुगतान के समय सर्वर को जाता है)
     * o = { serviceId, code, reportRef, onUnlock(result), show(ok, message), remember(code) }
     */
    handleCodeBox: async function(o) {
      var code = String((o && o.code) || '').trim();
      var show = (o && o.show) || function(ok, m) { alert(m); };
      if (!code) { show(false, 'कृपया कोड दर्ज करें।'); return false; }
      if (this.isPhoneCode(code)) {
        show(null, 'जाँच हो रही है...');
        var r = await this.redeemSaas(o.serviceId, code, o.reportRef);
        if (r.ok) { show(true, r.message); if (o.onUnlock) o.onUnlock(r); return true; }
        show(false, r.message || 'कोड अमान्य है।');
        return false;
      }
      if (o.remember) o.remember(code);
      // Ask the server: only the owner's OTP-signed-in phone gets "₹1 test" back for the master
      // code (any spacing or case); everyone else gets the same "invalid" reply as before.
      show(null, 'जाँच हो रही है...');
      var q = await this.fetchServerQuote(this.guessPhone(), o.serviceId, code);
      if (q && q.is_test) { show(true, (q.message || 'टेस्ट भुगतान ₹1।') + ' अब भुगतान बटन दबाएँ।'); return true; }
      show(false, 'कोड अमान्य है।');
      return false;
    },

    /**
     * कूपन बॉक्स: हर कोड पर एक ही जवाब ("कोड अमान्य है")। निर्णय केवल सर्वर पर।
     */
    validateAndCalculate: function(rawCode, basePrice) {
      // Every code gets the same reply. The typed code is still sent with the order;
      // only the server knows if it is the developer's test code for the developer's own number.
      var code = (rawCode || '').trim();
      if (!code) return { valid: false, code: '', message: 'कृपया कोड दर्ज करें।' };
      return { valid: false, code: code, message: 'कोड अमान्य है।' };
    },

    /**
     * Razorpay ऑप्शंस में सूत्रधार मेटाडेटा और संशोधित राशि इंजेक्ट करना
     */
    patchRazorpayOptions: function(options) {
      // राशि अब केवल सर्वर order से आती है; यहाँ सिर्फ़ जानकारी (notes) जुड़ती है
      if (!options) return options;
      if (!options.notes) options.notes = {};
      var activeRef = this.getActiveSutradharId();
      if (activeRef) options.notes.ref_link = activeRef;
      return options;
    },

    /**
     * सर्वर पर डबल-ट्रैकिंग लॉगिंग (api/save_payment.php)
     */
    logPaymentToServer: async function(paymentData) {
      try {
        var activeRef = this.getActiveSutradharId();
        var payload = Object.assign({}, paymentData);
        if (!payload.sutradhar_id && activeRef) {
          payload.sutradhar_id = activeRef;
        }
        if (!payload.coupon_code && activeRef) {
          payload.coupon_code = activeRef;
        }
        var res = await fetch('api/save_payment.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        return await res.json();
      } catch (err) {
        console.warn('[SRA Sutradhar Engine] Payment server log notice:', err);
        return { status: 'fallback', message: err.message };
      }
    }
  };

  // तुरंत इनिशियलाइज़ करें
  SraCouponEngine.init();

  // ग्लोबल एक्सपोज़र
  window.SraCouponEngine = SraCouponEngine;

})(window);
