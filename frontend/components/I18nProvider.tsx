"use client";
import { useEffect, useState } from "react";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { useLanguageStore } from "@/store/language";
import type { Locale } from "@/store/language";
import trMessages from "@/messages/tr.json";

const messageCache: Partial<Record<Locale, AbstractIntlMessages>> = {
  tr: trMessages as AbstractIntlMessages,
};

async function loadMessages(locale: Locale): Promise<AbstractIntlMessages> {
  if (messageCache[locale]) return messageCache[locale]!;
  const mod = await import(`@/messages/${locale}.json`);
  messageCache[locale] = (mod.default ?? mod) as AbstractIntlMessages;
  return messageCache[locale]!;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useLanguageStore();
  const [messages, setMessages] = useState<AbstractIntlMessages>(trMessages as AbstractIntlMessages);

  useEffect(() => {
    loadMessages(locale).then(setMessages);
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
