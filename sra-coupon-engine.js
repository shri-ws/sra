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
      // SD-XXX प्रारूप (जैसे SD-101, SD-105, SD-999 आदि)
      if (/^SD-\d{3,6}$/.test(code)) return true;
      // सामान्य सूत्रधार या मास्टर कोड्स
      if (code === 'MASTER' || code === 'SRAGODMODE' || code === 'RAM10') return true;
      return false;
    },

    /**
     * कूपन सत्यापन व 10% डिस्काउंट की सटीक गणना
     * @param {string} rawCode - ग्राहक द्वारा दर्ज किया गया कूपन कोड (सूत्रधार आईडी)
     * @param {number} basePrice - मूल मूल्य (रुपयों में, जैसे 24000, 5100, 1100, 250)
     */
    validateAndCalculate: function(rawCode, basePrice) {
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
      if (code === 'MASTER' || code === 'SRAGODMODE') {
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
          message: '✨ मास्टर की स्वीकृत! यह सत्र 100% निःशुल्क अधिकृत है।'
        };
      }

      // २. सूत्रधार यूनिक आईडी नियम (10% फ्लैट डिस्काउंट)
      if (this.isValidCode(code)) {
        var discountPct = 10;
        var discountAmt = Math.round(basePrice * 0.10);
        var finalAmt = Math.max(0, basePrice - discountAmt);
        var finalPaise = Math.round(finalAmt * 100);

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
