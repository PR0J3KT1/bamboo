"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { displayPhone, normalizeKenyanPhone } from "@/lib/phone";
import { completeProfile } from "@/app/actions/profile";
import { Button, buttonStyles } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { SignInHeader } from "./sign-in-header";

type Step = "phone" | "code" | "profile";
const STEPS: { id: Step; name: string }[] = [
  { id: "phone", name: "Phone" },
  { id: "code", name: "Code" },
  { id: "profile", name: "About you" },
];

function Steps({ step }: { step: Step }) {
  const at = STEPS.findIndex((s) => s.id === step);
  return (
    <ol aria-label="Steps" className="flex gap-1.5">
      {STEPS.map((s, i) => (
        <li key={s.id} aria-current={i === at ? "step" : undefined} className="flex flex-1 flex-col gap-1.5">
          <span className={cn("h-1 rounded-full", i <= at ? "bg-action" : "bg-line")} />
          <span className={cn("text-fine", i === at ? "font-bold" : "text-ink-2")}>{s.name}</span>
        </li>
      ))}
    </ol>
  );
}

/* Six boxes for the code. One real input lies over them (transparent), so typing, pasting and
   the phone's "fill from messages" all work as normal; the boxes only show it. */
function CodeBoxes({ value, onChange, invalid }: { value: string; onChange: (v: string) => void; invalid: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <div aria-hidden className="grid grid-cols-6 gap-2">
        {Array.from({ length: 6 }, (_, i) => {
          const current = focused && (i === value.length || (i === 5 && value.length === 6));
          return (
            <span
              key={i}
              className={cn(
                "figures flex h-[60px] items-center justify-center rounded-xl border-[1.5px] bg-panel text-[2rem]",
                invalid ? "border-danger" : current ? "border-2 border-action shadow-[0_0_0_4px_rgb(45_94_41/0.15)]" : "border-line",
              )}
            >
              {value[i] ?? ""}
            </span>
          );
        })}
      </div>
      <input
        id="otp"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={value}
        aria-invalid={invalid || undefined}
        aria-describedby="otp-help"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
        autoFocus
      />
    </div>
  );
}

/** Seconds left before another code can be asked for, counting from when the last one was sent. */
function useResendIn(sentAt: number, wait = 30) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!sentAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [sentAt]);
  if (!sentAt) return 0;
  return Math.min(wait, Math.max(0, wait - Math.floor((now - sentAt) / 1000)));
}

export function SignInFlow({ signedIn, profileComplete, next }: { signedIn: boolean; profileComplete: boolean; next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(signedIn ? "profile" : "phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const e164 = normalizeKenyanPhone(phone);
  const [sentAt, setSentAt] = useState(0);
  const resendIn = useResendIn(sentAt);

  if (signedIn && profileComplete) {
    return (
      <>
        <SignInHeader title="You're signed in" note="Your account is ready." />
        <div className="mx-auto w-full max-w-md px-4 py-6">
          <Link href={next} className={buttonStyles({ variant: "main", size: "lg", block: true })}>{next === "/" ? "Back to the menu" : "Carry on"}</Link>
        </div>
      </>
    );
  }

  function sendCode() {
    setError(null);
    if (!e164) return setError("Enter a Kenyan mobile number, like 0712 345 678.");
    start(async () => {
      const { error } = await authClient.phoneNumber.sendOtp({ phoneNumber: e164 });
      if (error) return setError(error.message ?? "The code couldn't be sent. Try again in a minute.");
      setCode("");
      setSentAt(Date.now());
      setStep("code");
    });
  }

  function verify() {
    setError(null);
    start(async () => {
      const { error } = await authClient.phoneNumber.verify({ phoneNumber: e164!, code: code.trim() });
      if (error) return setError(error.message ?? "That code didn't work. Check it and try again.");
      const s = await authClient.getSession();
      if (s.data?.user.dateOfBirth) {
        router.push(next);
        router.refresh();
      } else setStep("profile");
    });
  }

  function saveProfile() {
    setError(null);
    start(async () => {
      const r = await completeProfile({ name, dateOfBirth: dob, confirmed });
      if (!r.ok) return setError(r.error);
      if (r.adult) {
        router.push(next);
        router.refresh();
      } else {
        const on = new Date(r.eighteenOn + "T00:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
        setMessage(`Your account is ready. The Cask Room opens on ${on}. Until then you can order food and soft drinks.`);
      }
    });
  }

  if (message) {
    return (
      <>
        <SignInHeader title="You're in" note="Food, soft drinks and the games are open to you." />
        <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-6">
          <p className="text-body">{message}</p>
          <Link href="/" className={buttonStyles({ variant: "main", size: "lg", block: true })}>To the menu</Link>
        </div>
      </>
    );
  }

  const head =
    step === "phone"
      ? { title: "Sign in", note: "Your phone number, confirmed with a code. No password." }
      : step === "code"
        ? { title: "Check your messages", note: `We sent a 6-digit code to ${e164 ? displayPhone(e164) : phone}.` }
        : { title: "About you", note: "Set once. The Cask Room opens for accounts aged 18 or over." };

  return (
    <>
      <SignInHeader {...head} />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-5">
        <Steps step={step} />
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (step === "phone") sendCode();
            else if (step === "code") verify();
            else saveProfile();
          }}
        >
          {step === "phone" && (
            <TextField label="Mobile number" type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} error={error} />
          )}
          {step === "code" && (
            <>
              <div className="flex flex-col gap-2.5">
                <label htmlFor="otp" className="font-semibold">The code</label>
                <CodeBoxes value={code} onChange={(v) => { setCode(v); setError(null); }} invalid={!!error} />
                {error && <p role="alert" className="text-fine font-semibold text-danger">{error}</p>}
                <p id="otp-help" className="text-fine text-ink-2">
                  The code works for 10 minutes.{" "}
                  {resendIn > 0 ? (
                    <>You can ask for a new one in 0:{String(resendIn).padStart(2, "0")}.</>
                  ) : (
                    <button type="button" className="font-semibold text-action underline" disabled={pending} onClick={sendCode}>Send a new code</button>
                  )}
                </p>
              </div>
              <button type="button" className="self-start text-body font-semibold text-action underline" onClick={() => { setCode(""); setError(null); setStep("phone"); }}>
                Use a different number
              </button>
            </>
          )}
          {step === "profile" && (
            <>
              <TextField label="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
              <TextField label="Date of birth" type="date" value={dob} onChange={(e) => setDob(e.target.value)} hint="You can set it only once." />
              <label className="flex items-start gap-3 text-body">
                <input type="checkbox" className="mt-1 size-5 accent-[var(--action)]" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                <span>This is my real date of birth. The rider checks ID when alcohol is handed over.</span>
              </label>
              {error && <p role="alert" className="text-fine font-semibold text-danger">{error}</p>}
            </>
          )}
          <Button type="submit" variant="main" size="lg" block disabled={pending || (step === "code" && code.length !== 6)}>
            {pending ? "Please wait…" : step === "phone" ? "Send the code" : step === "code" ? "Confirm" : "Save"}
          </Button>
        </form>
        <p className="mt-auto text-fine text-ink-2">
          The Cask Room opens for accounts aged 18 or over. The rider still checks ID when alcohol is handed over.
        </p>
      </div>
    </>
  );
}
