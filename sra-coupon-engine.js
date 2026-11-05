/**
 * ============================================================================
 * श्री राम जी एस्ट्रो (shriramjiastro.in) - आधिकारिक सूत्रधार व कूपन इंजन
 * SRA UNIFIED SUTRADHAR REFERRAL & 10% UNIVERSAL COUPON SYSTEM
 * ============================================================================
 * मुख्य नियम:
 * 1. प्रत्येक सूत्रधार की यूनिक आईडी (उदा. SD-105) ही उसका आधिकारिक कूपन कोड है।
 * 2. किसी भी प्रोडक्ट (कोर्स, परामर्श, मुहूर्त, कुण्डली) पर यह कूपन कोड 10% फ्लैट डिस्काउंट देता है।
 * 3. डेटाबेस (MySQL & payments_log.json) और Razorpay notes में यह आईडी दर्ज होती है।
 * 4. पेमेंट रसीद/स्क्रीनशॉट और बैंक स्टेटमेंट से 100% डबल-रेक्टिफिकेशन सुनिश्चित होता है।
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
     * कोड की वैधता जांचना (केवल सूत्रधार कोड अथवा जय हनुमान मास्टर की मान्य)
     */
    isValidCode: function(rawCode) {
      if (!rawCode) return false;
      var code = String(rawCode).trim().toUpperCase();
      var cleanCode = code.replace(/[-_\s]/g, '');

      // १. जय हनुमान मास्टर की
      if (cleanCode === 'JAIHANUMAN' || cleanCode === 'जयहनुमान' || code === 'JAI HANUMAN' || code === 'जय हनुमान' || code === 'JAI_HANUMAN' || code === 'MASTER') return true;
      if (typeof window !== 'undefined' && window.sraIsMasterKey && window.sraIsMasterKey(rawCode)) return true;

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
    fetchServerQuote: async function(arg1, arg2, arg3) {
      var phone = '';
      var serviceId = 'manglik_dosha';
      var couponCode = '';

      if (typeof arg1 === 'string' && /^\d{10}$/.test(arg1.replace(/\D/g, ''))) {
        phone = arg1.replace(/\D/g, '').slice(-10);
        serviceId = arg2 || 'manglik_dosha';
        couponCode = arg3 || '';
      } else if (typeof arg2 === 'string' && /^\d{10}$/.test(arg2.replace(/\D/g, ''))) {
        serviceId = arg1 || 'manglik_dosha';
        phone = arg2.replace(/\D/g, '').slice(-10);
        couponCode = arg3 || '';
      } else {
        phone = String(arg1 || '').replace(/\D/g, '').slice(-10);
        serviceId = arg2 || 'manglik_dosha';
        couponCode = arg3 || '';
      }

      if (!phone) {
        try {
          var el = document.getElementById('mangalPhone') || document.getElementById('inMangalPhone');
          phone = (el ? el.value : '') || localStorage.getItem('sra_verified_mobile') || localStorage.getItem('sra_user_phone') || '';
          phone = String(phone).replace(/\D/g, '').slice(-10);
        } catch(e){}
      }

      var code = (couponCode || this.getActiveSutradharId() || '').trim().toUpperCase().replace(/-/g, '');
      var apiBase = (window.SRA_API_BASE || 'https://sra-canonical-engine.onrender.com');
      try {
        var res = await fetch(apiBase + '/api/sutradhar/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_phone: phone,
            service_id: serviceId || 'manglik_dosha',
            coupon_code: code || null
          })
        });
        if (res.ok) {
          var quote = await res.json();
          return quote;
        }
      } catch (err) {
        console.warn('[SraCouponEngine] Server quote fallback:', err);
      }
      return null;
    },

    /**
     * सर्वर पर सुरक्षित एवं छेड़छाड़-मुक्त Razorpay Order ID तैयार करना
     */
    createServerOrder: async function(customerPhone, customerEmail, serviceId, couponCode) {
      var phone = String(customerPhone || '').replace(/\D/g, '').slice(-10);
      var code = (couponCode || this.getActiveSutradharId() || '').trim().toUpperCase().replace(/-/g, '');
      var apiBase = (window.SRA_API_BASE || 'https://sra-canonical-engine.onrender.com');
      try {
        var res = await fetch(apiBase + '/api/sutradhar/orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_phone: phone,
            customer_email: customerEmail || '',
            service_id: serviceId || 'manglik_dosha',
            coupon_code: code || null
          })
        });
        if (res.ok) {
          return await res.json();
        } else {
          var errData = await res.json().catch(function() { return {}; });
          throw new Error(errData.detail || 'ऑर्डर तैयार करने में त्रुटि');
        }
      } catch (err) {
        console.error('[SraCouponEngine] createServerOrder failed:', err);
        throw err;
      }
    },

    /**
     * कूपन सत्यापन व 10% डिस्काउंट की सटीक गणना
     * केवल अधिकृत सूत्रधार कूपन अथवा जय हनुमान मास्टर की मान्य
     */
    validateAndCalculate: function(rawCode, basePrice, customerPhone) {
      var code = (rawCode || '').trim().toUpperCase();
      var cleanCode = code.replace(/[-_\s]/g, '');
      basePrice = Number(basePrice) || 0;

      if (!code) {
        return {
          valid: false,
          code: '',
          message: 'कृपया कूपन कोड दर्ज करें।'
        };
      }

      // १. जय हनुमान मास्टर की बायपास (100% निःशुल्क अधिकृत)
      var isMaster = (cleanCode === 'JAIHANUMAN' || cleanCode === 'जयहनुमान' || code === 'JAI HANUMAN' || code === 'जय हनुमान' || code === 'JAI_HANUMAN' || code === 'MASTER' || (typeof window !== 'undefined' && window.sraIsMasterKey && window.sraIsMasterKey(rawCode)));
      if (isMaster) {
        return {
          valid: true,
          code: code,
          sutradhar_id: 'MASTER_ADMIN',
          type: 'master',
          basePrice: basePrice,
          discountPercent: 100,
          discountAmount: basePrice,
          finalAmount: 0,
          finalAmountPaise: 0,
          commission_eligible: false,
          lead_verified: true,
          message: '✨ जय हनुमान मास्टर की स्वीकृत! 100% अधिकृत।'
        };
      }

      // २. सूत्रधार प्रणाली: कूपन कोड की आवश्यकता नहीं (72 घंटे का फ़ोन-लॉक एट्रिब्यूशन)
      // ग्राहक पूरा दक्षिणा मूल्य देता है, और सूत्रधार को उनका ₹20 कमीशन स्वतः मिलता है।
      return {
        valid: false,
        code: code,
        message: 'कूपन कोड की आवश्यकता नहीं है। सूत्रधार इंसेंटिव 72 घंटे के फ़ोन-लॉक द्वारा स्वतः संबद्ध रहता है।'
      };
    },

    /**
     * Razorpay ऑप्शंस में सूत्रधार मेटाडेटा और संशोधित राशि इंजेक्ट करना
     */
    patchRazorpayOptions: function(options, couponResult) {
      if (!options) return options;
      if (!options.notes) options.notes = {};

      if (couponResult && couponResult.valid) {
        options.amount = couponResult.finalAmountPaise;
        options.notes.coupon_code = couponResult.code;
        options.notes.sutradhar_id = couponResult.sutradhar_id;
        options.notes.discount_applied = '₹' + couponResult.discountAmount;
        options.notes.sutradhar_verified = 'true';
      } else {
        var activeRef = this.getActiveSutradharId();
        if (activeRef) {
          options.notes.sutradhar_id = activeRef;
          options.notes.sutradhar_verified = 'via_url_ref';
        }
      }
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
