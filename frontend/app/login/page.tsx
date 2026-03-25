"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Film } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const schema = z.object({
  email: z.string().email("Gecerli bir e-posta girin."),
  password: z.string().min(1, "Sifre zorunludur."),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      toast.success("Giris yapildi!");
      router.push("/");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-xl bg-crimson/10 border border-crimson/30 flex items-center justify-center">
              <Film className="w-6 h-6 text-crimson" />
            </div>
          </div>
          <h1 className="font-heading text-3xl font-bold text-[#F0F0F5]">Hos Geldin</h1>
          <p className="text-[#8A8AA8] mt-1">Hesabina giris yap</p>
        </div>

        <div className="bg-midnight border border-border rounded-2xl p-8 space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              {...register("email")}
              label="E-posta"
              type="email"
              placeholder="ornek@email.com"
              error={errors.email?.message}
            />
            <Input
              {...register("password")}
              label="Sifre"
              type="password"
              placeholder="********"
              error={errors.password?.message}
            />
            <Button type="submit" className="w-full" size="lg" loading={isLoading}>
              Giris Yap
            </Button>
          </form>

          <p className="text-center text-sm text-[#8A8AA8]">
            Hesabin yok mu?{" "}
            <Link href="/register" className="text-crimson hover:text-red-400 font-medium transition-colors">
              Kayit Ol
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
