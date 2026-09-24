import { useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logo from "@/assets/aziza-logo.png";

const emailField = z.string().trim().email("Please enter a valid email").max(320);

// Sign-in must NOT enforce a length rule. The server is the authority on whether
// a password is right, and any account created before a rule changed would be
// locked out of the UI by a client-side minimum it can never satisfy.
const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password").max(128),
});

// Length is a rule about choosing a NEW password, so it belongs here only.
const signUpSchema = z.object({
  email: emailField,
  password: z.string().min(8, "Choose a password of at least 8 characters").max(128),
});

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const validate = (schema: typeof signInSchema | typeof signUpSchema) => {
    const r = schema.safeParse({ email, password });
    if (!r.success) {
      toast.error(r.error.errors[0].message);
      return null;
    }
    return r.data;
  };

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    const v = validate(signInSchema);
    if (!v) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password });
    setBusy(false);
    if (error) toast.error(error.message);
  };

  const signUp = async (e: FormEvent) => {
    e.preventDefault();
    const v = validate(signInSchema);
    if (!v) return;
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: { emailRedirectTo: `${window.location.origin}/workspace` },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Check your email to confirm your account.");
  };

  const fields = (id: string) => (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${id}-email`}>Email</Label>
        <Input id={`${id}-email`} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-password`}>Password</Label>
        <Input
          id={`${id}-password`}
          type="password"
          autoComplete={id === "in" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
    </>
  );

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background font-body">
      <div className="bg-primary text-primary-foreground flex flex-col justify-center gap-8 p-10 md:p-16">
        <img src={logo} alt="Aziza Home" className="h-14 w-auto self-start" style={{ filter: "brightness(0) invert(1)" }} />
        <p className="font-heading uppercase tracking-[0.2em] text-2xl md:text-3xl leading-snug">
          From lead to handover. One workspace.
        </p>
      </div>
      <div className="flex items-center justify-center p-6 md:p-16">
        <div className="w-full max-w-sm space-y-6">
          <Tabs defaultValue="in">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="in">Sign in</TabsTrigger>
              <TabsTrigger value="up">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="in">
              <form onSubmit={signIn} className="space-y-4 pt-4">
                {fields("in")}
                <Button type="submit" className="w-full" disabled={busy}>Sign in</Button>
              </form>
            </TabsContent>
            <TabsContent value="up">
              <form onSubmit={signUp} className="space-y-4 pt-4">
                {fields("up")}
                <Button type="submit" className="w-full" disabled={busy}>Create account</Button>
              </form>
            </TabsContent>
          </Tabs>
          <p className="text-xs text-muted-foreground">
            Accounts are invite-only. If your email has not been added by the GM you will be able to sign up but will not see any data.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
