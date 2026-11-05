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
     * कोड की वैधता जांचना
     */
    isValidCode: function(rawCode) {
      if (!rawCode) return false;
      var code = String(rawCode).trim().toUpperCase();
      // SRA-XXXXXX, SD-XXX, या SUTRA-XXXX प्रारूप (उदा. SRA-7K3M9Q, SD-105, SUTRA-01 आदि)
      if (/^SRA-[A-Z0-9]{4,10}$/i.test(code) || /^SD-?\d{2,6}$/i.test(code) || /^SUTRA/i.test(code)) return true;
      // सामान्य सूत्रधार या मास्टर कोड्स
      if (code === 'MASTER' || code === 'SRAGODMODE' || code === 'RAM10' || code === 'VIDYA10' || code === 'SRA10') return true;
      if (typeof window !== 'undefined' && window.sraIsMasterKey && window.sraIsMasterKey(rawCode)) return true;
      // लोकल स्टोरेज में मौजूद सूत्रधार प्रोफाइल/सेशन जांच
      try {
        var sess = JSON.parse(localStorage.getItem('sra_sutradhar_session') || '{}');
        if (sess && sess.sutradhar_id && sess.sutradhar_id.toUpperCase() === code) return true;
        var prof = JSON.parse(localStorage.getItem('sra_sutradhar_profile') || '{}');
        if (prof && prof.sutradhar_id && prof.sutradhar_id.toUpperCase() === code) return true;
        if (prof && prof.code && prof.code.toUpperCase() === code) return true;
      } catch(e) {}
      return false;
    },

    /**
     * सर्वर से रीयल-टाइम मूल्य और स्वचालित डिस्काउंट प्राप्त करना (10% Auto-Attribution)
     * यदि ग्राहक का नंबर किसी सूत्रधार की सक्रिय लीड में है, तो 10% छूट अपने-आप लागू होगी।
     */
    fetchServerQuote: async function(customerPhone, serviceId, couponCode) {
      var phone = String(customerPhone || '').replace(/\D/g, '').slice(-10);
      var code = (couponCode || this.getActiveSutradharId() || '').trim().toUpperCase();
      try {
        var res = await fetch('/api/sutradhar/quote', {
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
      var code = (couponCode || this.getActiveSutradharId() || '').trim().toUpperCase();
      try {
        var res = await fetch('/api/sutradhar/orders/create', {
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
     * 2-फैक्टर सत्यापन: जातक नंबर प्री-रजिस्ट्रेशन चेक
     * @param {string} rawCode - ग्राहक द्वारा दर्ज किया गया कूपन कोड (सूत्रधार आईडी)
     * @param {number} basePrice - मूल मूल्य (रुपयों में, जैसे 24000, 5100, 1100, 250)
     * @param {string} customerPhone - ग्राहक का 10-अंकों का मोबाइल नंबर (वैकल्पिक/जाँच हेतु)
     */
    validateAndCalculate: function(rawCode, basePrice, customerPhone) {
      var code = (rawCode || '').trim().toUpperCase();
      basePrice = Number(basePrice) || 0;

      if (!code) {
        return {
          valid: false,
          code: '',
          message: 'कृपया कूपन कोड या अपने सूत्रधार की आईडी (उदा. SD-105) दर्ज करें।'
        };
      }

      // १. मास्टर की बायपास (व्यवस्थापक / आचार्य हेतु)
      if (code === 'MASTER' || code === 'SRAGODMODE' || (typeof window !== 'undefined' && window.sraIsMasterKey && window.sraIsMasterKey(rawCode))) {
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
          message: '✨ मास्टर की स्वीकृत! यह सत्र 100% निःशुल्क अधिकृत है।'
        };
      }

      // २. सूत्रधार यूनिक आईडी नियम (10% फ्लैट डिस्काउंट)
      if (this.isValidCode(code)) {
        var discountPct = 10;
        var discountAmt = Math.round(basePrice * 0.10);
        var finalAmt = Math.max(0, basePrice - discountAmt);
        var finalPaise = Math.round(finalAmt * 100);

        // जातक नंबर सत्यापन जांच (2-Factor Attribution)
        var cPhone = customerPhone || '';
        if (!cPhone) {
          try {
            cPhone = localStorage.getItem('sra_user_phone') || sessionStorage.getItem('sra_user_phone') || '';
          } catch(e){}
        }
        cPhone = String(cPhone).replace(/\D/g, '').slice(-10);

        var isLeadRegistered = false;
        if (cPhone && cPhone.length === 10) {
          try {
            var savedLeads = JSON.parse(localStorage.getItem('sra_leads_' + code) || '[]');
            if (Array.isArray(savedLeads)) {
              isLeadRegistered = savedLeads.some(function(l) {
                return String(l.customer_phone).replace(/\D/g, '').slice(-10) === cPhone;
              });
            }
          } catch(e){}
        }

        return {
          valid: true,
          code: code,
          sutradhar_id: code,
          type: 'sutradhar_unique_id',
          basePrice: basePrice,
          discountPercent: discountPct,
          discountAmount: discountAmt,
          finalAmount: finalAmt,
          finalAmountPaise: finalPaise,
          customer_phone: cPhone,
          lead_verified: isLeadRegistered,
          commission_eligible: isLeadRegistered,
          message: '✨ सूत्रधार कूपन (' + code + ') सफल! 10% की फ्लैट छूट लागू (बचत: ₹' + discountAmt.toLocaleString('en-IN') + ')'
        };
      }

      return {
        valid: false,
        code: code,
        message: 'अमान्य कूपन कोड। कृपया सूत्रधार द्वारा प्रदत्त सही आईडी (उदा. SD-105) दर्ज करें।'
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
