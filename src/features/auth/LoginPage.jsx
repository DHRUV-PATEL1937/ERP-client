import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navigate } from "react-router-dom";
import { Sprout, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../../app/providers";
import { Button, Field } from "../../components/ui";
const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
export default function LoginPage() {
  const { session, login } = useAuth();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });
  if (session) return <Navigate to="/" replace />;
  return (
    <div className="login">
      <div className="login-story">
        <div className="brand">
          <Sprout /> harvest<span>OPERATING SYSTEM</span>
        </div>
        <div>
          <div className="eyebrow">FROM THE GROUND UP</div>
          <h1>
            Good food.
            <br />
            Better business.
          </h1>
          <p>
            One thoughtfully connected workspace for the people who bring fresh
            food to the table.
          </p>
          <div className="login-line" />
        </div>
        <small>Grown with care. Managed with clarity.</small>
      </div>
      <div className="login-form">
        <form
          onSubmit={handleSubmit(async (v) => {
            try {
              setError("");
              await login(v);
            } catch (e) {
              setError(e.message);
            }
          })}
        >
          <Sprout size={34} color="#236b4a" />
          <h2>Welcome back.</h2>
          <p>Sign in to your farm-to-market workspace.</p>
          <Field label="Email address" error={errors.email?.message}>
            <input
              autoComplete="username"
              type="email"
              {...register("email")}
            />
          </Field>
          <Field label="Password" error={errors.password?.message}>
            <input
              autoComplete="current-password"
              type="password"
              {...register("password")}
            />
          </Field>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          <Button disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in to workspace"}
            <ArrowRight size={16} />
          </Button>
          <p className="login-note">
            <ShieldCheck size={15} /> Secure, organization-specific access
          </p>
          <small>
            Need access or a password reset? Contact your organization
            administrator.
          </small>
        </form>
      </div>
    </div>
  );
}
