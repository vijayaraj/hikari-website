// Hikari — plain JS. Theme toggle, scroll reveals, waitlist form.
// No frameworks, no build step.

(function () {
  'use strict';

  /* ---------- Theme ---------- */
  var STORAGE_KEY = 'hikari-theme';
  var root = document.documentElement;

  function applyTheme(theme) {
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    root.style.colorScheme = theme;
  }

  function initialTheme() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') return stored;
    } catch (_) {}
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light' : 'dark';
  }

  applyTheme(initialTheme());

  function wireToggles() {
    var btns = document.querySelectorAll('[data-theme-toggle]');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = root.classList.contains('dark') ? 'light' : 'dark';
        applyTheme(next);
        try { localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
        // sync aria-label
        btns.forEach(function (b) {
          b.setAttribute('aria-label', next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        });
      });
    });
  }

  /* ---------- Reveals ---------- */
  function wireReveals() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || els.length === 0) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Waitlist form ---------- */
  // Drop a real endpoint URL here when you're ready (Formspree, Buttondown, your serverless fn, etc.).
  // While null, the form simulates a successful signup so the UX is intact.
  var WAITLIST_ENDPOINT = 'https://formspree.io/f/xbdwleeg';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function wireWaitlist() {
    var forms = document.querySelectorAll('form.waitlist');
    forms.forEach(function (form) {
      var input = form.querySelector('input.email');
      var honeypot = form.querySelector('input.honeypot');
      var btn = form.querySelector('button.submit');
      var msg = form.querySelector('.msg');
      var defaultBtnText = btn.textContent;

      function setMsg(state, text) {
        msg.className = 'msg ' + state;
        msg.textContent = text;
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (btn.disabled) return;

        var value = (input.value || '').trim();
        if (!value) { setMsg('error', 'Please enter your email'); return; }
        if (value.length > 255) { setMsg('error', 'Email is too long'); return; }
        if (!EMAIL_RE.test(value)) { setMsg('error', 'Please enter a valid email'); return; }

        // Honeypot tripped — pretend success silently.
        if (honeypot && honeypot.value) {
          btn.disabled = true; input.disabled = true;
          btn.textContent = 'On the list ✓';
          setMsg('success', "You're on the list. Watch your inbox for a note from us.");
          return;
        }

        btn.disabled = true; input.disabled = true;
        btn.textContent = 'Joining…';
        setMsg('idle', '');

        var done = function (ok, errText) {
          if (ok) {
            btn.textContent = 'On the list ✓';
            setMsg('success', "You're on the list. Watch your inbox for a note from us.");
            input.value = '';
          } else {
            btn.disabled = false; input.disabled = false;
            btn.textContent = defaultBtnText;
            setMsg('error', errText || 'Something went wrong. Please try again.');
          }
        };

        if (!WAITLIST_ENDPOINT) {
          // No backend wired yet — simulate success.
          setTimeout(function () {
            console.log('[hikari/waitlist] new signup:', value);
            done(true);
          }, 600);
          return;
        }

        fetch(WAITLIST_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ email: value })
        })
          .then(function (res) { done(res.ok, res.ok ? '' : 'Server error. Please try again.'); })
          .catch(function () { done(false); });
      });

      // Clear error when user types again.
      input.addEventListener('input', function () {
        if (msg.classList.contains('error')) setMsg('idle', 'No spam. One note when Hikari opens.');
      });
    });
  }

  /* ---------- Typed transcript (continuous loop) ---------- */
  function wireTyped() {
    var els = document.querySelectorAll('[data-typed], [data-typed-cycle]');
    if (els.length === 0) return;

    // Multiple phrases per element via data-typed-cycle="phrase 1 | phrase 2 | ..."
    function phrasesFor(el) {
      var cycle = el.getAttribute('data-typed-cycle');
      if (cycle) return cycle.split('|').map(function (s) { return s.trim(); }).filter(Boolean);
      return [el.getAttribute('data-typed') || ''];
    }

    function loop(el) {
      var phrases = phrasesFor(el);
      var phraseIdx = 0;

      function typePhrase() {
        var full = phrases[phraseIdx];
        el.textContent = '';
        var i = 0;

        function typeStep() {
          if (i >= full.length) {
            // Hold the finished phrase, then erase
            setTimeout(eraseStep, 1800);
            return;
          }
          el.textContent += full.charAt(i++);
          var prev = full.charAt(i - 1);
          var delay = prev === ',' ? 220 : prev === '.' ? 280 : 45 + Math.random() * 50;
          setTimeout(typeStep, delay);
        }

        function eraseStep() {
          var current = el.textContent;
          if (current.length === 0) {
            phraseIdx = (phraseIdx + 1) % phrases.length;
            setTimeout(typePhrase, 450);
            return;
          }
          el.textContent = current.slice(0, -1);
          setTimeout(eraseStep, 24);
        }

        setTimeout(typeStep, 250);
      }

      typePhrase();
    }

    Array.prototype.forEach.call(els, loop);
  }

  function init() {
    wireToggles();
    wireReveals();
    wireWaitlist();
    wireTyped();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();