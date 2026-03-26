"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Check, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { userApi, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { Subscription } from "@/types";

const PLANS = [
  {
    name: "Aylik",
    price: "29.99 TL",
    period: "/ ay",
    features: [
      "Tum premium bolumlere erisim",
      "Reklamsiz izleme",
      "HD kalite",
    ],
    highlighted: false,
  },
  {
    name: "Yillik",
    price: "249.99 TL",
    period: "/ yil",
    features: [
      "Tum premium bolumlere erisim",
      "Reklamsiz izleme",
      "Full HD + 4K kalite",
      "2 ay ucretsiz",
    ],
    highlighted: true,
  },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user) return;
    userApi
      .getSubscriptions()
      .then(setSubscriptions)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [user]);

  const activeSub = subscriptions.find((s) => new Date(s.end_date) > new Date());

  if (!user) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-crimson animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-violet/10 border border-violet/30 flex items-center justify-center mx-auto">
          <Crown className="w-7 h-7 text-violet" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-fg">Premium Abonelik</h1>
        <p className="text-muted max-w-md mx-auto">
          Premium uyelik ile tum bolumlere sinirsiz erisim saglayin.
        </p>
      </div>

      {/* Active Subscription */}
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 text-crimson animate-spin" />
        </div>
      ) : activeSub ? (
        <div className="bg-midnight border border-violet/40 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-violet" />
            <div>
              <h2 className="font-heading text-xl font-bold text-fg">Aktif Abonelik</h2>
              <p className="text-muted text-sm">Su an premium uyesiniz</p>
            </div>
            <Badge variant="premium" className="ml-auto">Aktif</Badge>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div>
              <p className="text-xs text-dim uppercase tracking-wider">Plan</p>
              <p className="text-fg font-medium">{activeSub.plan_name}</p>
            </div>
            <div>
              <p className="text-xs text-dim uppercase tracking-wider">Baslangic</p>
              <p className="text-fg font-medium">{formatDate(activeSub.start_date)}</p>
            </div>
            <div>
              <p className="text-xs text-dim uppercase tracking-wider">Bitis</p>
              <p className="text-fg font-medium">{formatDate(activeSub.end_date)}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Subscription History */}
      {!loading && subscriptions.length > 0 && !activeSub && (
        <div className="bg-midnight border border-border rounded-xl p-5">
          <h3 className="font-heading text-lg font-semibold text-fg mb-3">Gecmis Abonelikler</h3>
          <div className="space-y-2">
            {subscriptions.map((s) => (
              <div key={s.subscription_id} className="flex items-center justify-between bg-obsidian rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm text-fg font-medium">{s.plan_name}</p>
                  <p className="text-xs text-dim">
                    {formatDate(s.start_date)} - {formatDate(s.end_date)}
                  </p>
                </div>
                <Badge variant="danger">Sona Erdi</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plans */}
      {!activeSub && (
        <div className="grid md:grid-cols-2 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-6 space-y-5 border transition-colors ${
                plan.highlighted
                  ? "bg-violet/5 border-violet/40 shadow-lg shadow-violet/5"
                  : "bg-midnight border-border"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="premium">En Populer</Badge>
                </div>
              )}

              <div>
                <h3 className="font-heading text-xl font-bold text-fg">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-heading text-3xl font-bold text-fg">{plan.price}</span>
                  <span className="text-dim text-sm">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted">
                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.highlighted ? "primary" : "ghost"}
                size="lg"
                className="w-full"
                onClick={() =>
                  toast.info("Odeme sistemi henuz aktif degil. Yonetici tarafindan abonelik atanabilir.")
                }
              >
                Abone Ol
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="text-center text-dim text-xs space-y-1">
        <p>Abonelik yoneticiniz tarafindan atanir.</p>
        <p>Sorulariniz icin destek ekibi ile iletisime gecin.</p>
      </div>
    </div>
  );
}
