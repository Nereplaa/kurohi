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
  name: z.string().min(1, "Ad zorunludur.").max(100),
  surname: z.string().min(1, "Soyad zorunludur.").max(100),
  email: z.string().email("Gecerli bir e-posta girin."),
  password: z.string().min(8, "Sifre en az 8 karakter olmalidir."),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, {
  message: "Sifreler eslesmiyor.",
  path: ["confirm"],
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await registerUser({ name: data.name, surname: data.surname, email: data.email, password: data.password });
      toast.success("Hesabiniz olusturuldu, hos geldiniz!");
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
          <h1 className="font-heading text-3xl font-bold text-fg">Hesap Olustur</h1>
          <p className="text-muted mt-1">Anime dunyasina katil</p>
        </div>

        <div className="bg-midnight border border-border rounded-2xl p-8 space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input {...register("name")} label="Ad" placeholder="Ahmet" error={errors.name?.message} />
              <Input {...register("surname")} label="Soyad" placeholder="Yilmaz" error={errors.surname?.message} />
            </div>
            <Input {...register("email")} label="E-posta" type="email" placeholder="ornek@email.com" error={errors.email?.message} />
            <Input {...register("password")} label="Sifre" type="password" placeholder="En az 8 karakter" error={errors.password?.message} />
            <Input {...register("confirm")} label="Sifre Tekrar" type="password" placeholder="********" error={errors.confirm?.message} />
            <Button type="submit" className="w-full" size="lg" loading={isLoading}>
              Kayit Ol
            </Button>
          </form>

          <p className="text-center text-sm text-muted">
            Zaten hesabin var mi?{" "}
            <Link href="/login" className="text-crimson hover:text-red-400 font-medium transition-colors">
              Giris Yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
