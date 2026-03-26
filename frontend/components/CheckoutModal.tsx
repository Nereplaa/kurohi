"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Crown, CheckCircle2, AlertCircle, Loader2, ShieldCheck, ExternalLink } from "lucide-react";
import { paymentApi, getErrorMessage } from "@/lib/api";
import type { CheckoutResponse } from "@/types";

// ── Types ──────────────────────────────────────────────────────────────────

type ModalState =
  | "idle"          // initial: shows plan + start button
  | "initiating"    // calling /initiate
  | "mock_confirm"  // mock mode: show simulate button
  | "confirming"    // mock mode: calling /mock-confirm
  | "form"          // live mode: Iyzico form injected, waiting for redirect
  | "success"       // mock mode success
  | "error";        // any error

interface Plan {
  name: string;
  price: string;
  period: string;
}

interface Props {
  plan: Plan;
  onSuccess: (sub: CheckoutResponse) => void;
  onClose: () => void;
}

// ── Iyzico script injector ─────────────────────────────────────────────────
// checkoutFormContent is an HTML snippet containing one or more <script> tags.
// We parse every <script> and recreate it as a real DOM element so browsers execute it
// (innerHTML-injected scripts are inert by spec).
function injectIyzicoScript(html: string): HTMLScriptElement | null {
  const container = document.createElement("div");
  container.innerHTML = html;

  let lastInserted: HTMLScriptElement | null = null;
  container.querySelectorAll("script").forEach((tpl) => {
    const s = document.createElement("script");
    if (tpl.src) {
      s.src = tpl.src;
      s.async = true;
    } else {
      s.textContent = tpl.textContent;
    }
    document.head.appendChild(s);
    lastInserted = s;
  });

  return lastInserted;
}

// ── Component ──────────────────────────────────────────────────────────────

export function CheckoutModal({ plan, onSuccess, onClose }: Props) {
  const [state, setState] = useState<ModalState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [token, setToken] = useState("");
  const [checkoutFormContent, setCheckoutFormContent] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<CheckoutResponse | null>(null);
  const [mounted, setMounted] = useState(false);
  const injectedScriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Close on Escape (not while Iyzico form is visible)
  useEffect(() => {
    if (state === "form") return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [state, onClose]);

  // Inject Iyzico script AFTER React has rendered the #iyzipay-checkout-form div.
  // This effect runs only when state transitions to "form" and content is available.
  useEffect(() => {
    if (state !== "form" || !checkoutFormContent) return;
    const script = injectIyzicoScript(checkoutFormContent);
    if (script) injectedScriptRef.current = script;
  }, [state, checkoutFormContent]);

  // Cleanup injected script on unmount
  useEffect(() => {
    return () => {
      if (injectedScriptRef.current) {
        try { document.head.removeChild(injectedScriptRef.current); } catch {}
        injectedScriptRef.current = null;
      }
    };
  }, []);

  // ── Initiate checkout ────────────────────────────────────────────────────
  const handleStart = async () => {
    setState("initiating");
    try {
      const res = await paymentApi.initiate(plan.name);
      setToken(res.token);

      if (res.mock_mode) {
        setState("mock_confirm");
      } else {
        // Store content first, then change state.
        // The useEffect above will inject the script after the form div is rendered.
        setCheckoutFormContent(res.checkout_form_content);
        setState("form");
      }
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
      setState("error");
    }
  };

  // ── Mock confirm ─────────────────────────────────────────────────────────
  const handleMockConfirm = async () => {
    setState("confirming");
    try {
      const result = await paymentApi.mockConfirm(token);
      setSuccessData(result);
      setState("success");
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
      setState("error");
    }
  };

  if (!mounted) return null;

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        // Don't close while Iyzico form is active or loading
        if (state === "form" || state === "initiating" || state === "confirming") return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-[480px] rounded-2xl overflow-hidden"
        style={{
          background: "var(--modal-card-bg)",
          border: "1px solid var(--modal-card-border)",
          boxShadow: "0 0 0 1px var(--modal-card-ring), var(--modal-card-shadow)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient header strip */}
        <div style={{ height: 3, background: "linear-gradient(90deg,#dc143c,#6c5ce7,transparent)" }} />

        {/* Close button — hidden while Iyzico form is active */}
        {state !== "form" && (
          <button
            onClick={onClose}
            disabled={state === "initiating" || state === "confirming"}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-40"
            style={{ color: "var(--modal-meta)" }}
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* ── IDLE ──────────────────────────────────────────────────────── */}
        {state === "idle" && (
          <div className="p-7 space-y-6">
            <PlanSummary plan={plan} />

            <div style={{ height: 1, background: "var(--modal-divider)" }} />

            <div className="space-y-3">
              <button
                onClick={handleStart}
                className="w-full flex items-center justify-center gap-2.5 bg-crimson hover:bg-red-600 text-white font-bold text-sm py-3 rounded-xl transition-all active:scale-[0.98]"
                style={{ boxShadow: "0 4px 20px rgba(220,20,60,0.30)" }}
              >
                <ShieldCheck className="w-4 h-4" />
                Ödeme Adımına Geç
              </button>

              <p className="text-center text-[11px]" style={{ color: "var(--modal-label)" }}>
                256-bit SSL şifreleme · Kart verisi sistemimizde saklanmaz · İstediğiniz zaman iptal
              </p>
            </div>
          </div>
        )}

        {/* ── INITIATING ────────────────────────────────────────────────── */}
        {state === "initiating" && (
          <div className="p-10 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-violet animate-spin" />
            <p className="text-sm font-medium" style={{ color: "var(--modal-meta)" }}>
              Ödeme oturumu başlatılıyor…
            </p>
          </div>
        )}

        {/* ── MOCK CONFIRM ──────────────────────────────────────────────── */}
        {state === "mock_confirm" && (
          <div className="p-7 space-y-6">
            <PlanSummary plan={plan} />

            <div
              className="rounded-xl p-4 space-y-2 text-sm"
              style={{ background: "rgba(108,92,231,0.07)", border: "1px solid rgba(108,92,231,0.25)" }}
            >
              <p className="font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--modal-label)" }}>
                Test / Sandbox Modu
              </p>
              <p className="text-xs" style={{ color: "var(--modal-meta)" }}>
                Iyzico API anahtarı tanımlı değil. Gerçek ödeme formu yerine simülasyon
                kullanılıyor. Üretimde <code className="font-mono text-violet">.env</code> dosyasına
                API anahtarlarını ekleyin.
              </p>
            </div>

            <button
              onClick={handleMockConfirm}
              className="w-full flex items-center justify-center gap-2 bg-violet hover:bg-violet/80 text-white font-bold text-sm py-3 rounded-xl transition-all active:scale-[0.98]"
              style={{ boxShadow: "0 4px 20px rgba(108,92,231,0.25)" }}
            >
              <ShieldCheck className="w-4 h-4" />
              Test Ödemesini Onayla — {plan.price}
            </button>

            <p className="text-center text-[11px]" style={{ color: "var(--modal-label)" }}>
              Bu buton yalnızca mock modda görünür.
            </p>
          </div>
        )}

        {/* ── CONFIRMING ────────────────────────────────────────────────── */}
        {state === "confirming" && (
          <div className="p-10 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-violet animate-spin" />
            <p className="text-sm font-medium" style={{ color: "var(--modal-meta)" }}>
              Abonelik oluşturuluyor…
            </p>
          </div>
        )}

        {/* ── LIVE FORM (waiting for Iyzico redirect) ────────────────────── */}
        {state === "form" && (
          <div className="p-7 space-y-5">
            <PlanSummary plan={plan} />

            {/* Iyzico renders its payment form into this div */}
            <div
              id="iyzipay-checkout-form"
              className="responsive"
              style={{ minHeight: 280 }}
            />

            <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--modal-label)" }}>
              <ExternalLink className="w-3 h-3 shrink-0" />
              Ödeme Iyzico güvenli formu üzerinden alınmaktadır. Tamamlandıktan sonra
              otomatik yönlendirileceksiniz.
            </div>
          </div>
        )}

        {/* ── SUCCESS ───────────────────────────────────────────────────── */}
        {state === "success" && successData && (
          <div className="p-8 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-heading text-xl font-bold" style={{ color: "var(--modal-heading)" }}>
                Aboneliğiniz Başlatıldı!
              </h3>
              <p className="text-sm mt-1" style={{ color: "var(--modal-meta)" }}>
                {successData.plan_name} planı aktif edildi.
              </p>
            </div>
            <div
              className="w-full rounded-xl p-4 space-y-2 text-sm"
              style={{ background: "rgba(108,92,231,0.08)", border: "1px solid rgba(108,92,231,0.2)" }}
            >
              <Row label="Plan" value={successData.plan_name} />
              <Row label="Bitiş Tarihi" value={successData.end_date} />
              <Row label="Ödeme ID" value={successData.payment_id} mono />
            </div>
            <button
              onClick={() => { onSuccess(successData!); onClose(); }}
              className="w-full py-3 rounded-xl font-bold text-sm bg-violet hover:bg-violet/80 text-white transition-all"
            >
              Harika, Devam Et →
            </button>
          </div>
        )}

        {/* ── ERROR ─────────────────────────────────────────────────────── */}
        {state === "error" && (
          <div className="p-8 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h3 className="font-heading text-xl font-bold" style={{ color: "var(--modal-heading)" }}>
                Bir Hata Oluştu
              </h3>
              <p className="text-sm mt-1 max-w-xs mx-auto" style={{ color: "var(--modal-meta)" }}>
                {errorMsg}
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setState("idle")}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm border hover:bg-white/5 transition-all"
                style={{ color: "var(--modal-ghost-fg)", borderColor: "var(--modal-ghost-border)" }}
              >
                Tekrar Dene
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-crimson/90 hover:bg-crimson text-white transition-all"
              >
                Kapat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// ── Sub-components ─────────────────────────────────────────────────────────

function PlanSummary({ plan }: { plan: Plan }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-violet/15 border border-violet/30 flex items-center justify-center shrink-0">
        <Crown className="w-5 h-5 text-violet" />
      </div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--modal-label)" }}>
          Seçilen Plan
        </p>
        <p style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--modal-heading)", lineHeight: 1.3 }}>
          {plan.name} — {plan.price}{" "}
          <span style={{ fontSize: "0.75rem", color: "var(--modal-meta)", fontWeight: 400 }}>{plan.period}</span>
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: "var(--modal-label)" }}>{label}</span>
      <span
        className={mono ? "font-mono text-xs" : "font-semibold"}
        style={{ color: mono ? "var(--modal-meta)" : "var(--modal-heading)" }}
      >
        {value}
      </span>
    </div>
  );
}
